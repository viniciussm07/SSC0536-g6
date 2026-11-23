import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  ESQUEMA_LINHAS_IMPORTACAO,
  ESQUEMA_LOTES_IMPORTACAO,
  ESQUEMA_OCORRENCIAS_IMPORTACAO,
  LIMITES_IMPORTACAO,
  VERSOES_PARSER,
  type CelulaBruta,
  type ConfirmacaoLote,
  type CanonicoLinha,
  type EstadoLote,
  type FonteImportacao,
  type LinhaImportacaoLinha,
  type LoteImportacaoDetalhe,
  type LoteImportacaoLinha,
  type OcorrenciaImportacaoLinha,
  type ResumoLeitura,
  type SeveridadeOcorrencia,
  type SituacaoLinhaImportacao,
  type TipoLinhaImportacao,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import { naoEncontrado } from '../acesso/acesso.errors';
import { registrarAuditoria } from '../auditoria/registrar-auditoria';
import { executarColecao } from '../odata/colecao-odata';
import type { ConsultaColecao } from '../odata/odata.decorators';
import {
  arquivoJaRecebido,
  arquivoMuitoGrande,
  arquivoVazio,
  leituraEmAndamento,
} from './importacoes.errors';
import { MAPA_LINHAS, MAPA_LOTES, MAPA_OCORRENCIAS } from './importacoes.odata';
import {
  lerTabulacaoConsolidado,
  type ResultadoLeitura,
} from './tabulacao-consolidado.parser';
import { ErroLeitura, lerXlsx } from './xlsx.leitor';
import { ConciliacaoService } from './conciliacao.service';

/** Leitura travada além deste prazo é tratada como interrompida e pode ser refeita. */
const PRAZO_LEITURA_MS = 2 * 60 * 1000;

type LoteBanco = {
  id: number;
  fonte: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  versaoParser: string;
  estado: string;
  criadoEm: Date;
  lidoEm: Date | null;
};
const paraLinha = (l: LoteBanco): LoteImportacaoLinha => ({
  id: l.id,
  fonte: l.fonte as FonteImportacao,
  nomeArquivo: l.nomeArquivo,
  tamanhoBytes: l.tamanhoBytes,
  versaoParser: l.versaoParser,
  estado: l.estado as EstadoLote,
  criadoEm: l.criadoEm.toISOString(),
  lidoEm: l.lidoEm?.toISOString() ?? null,
});

/** Executa o parser da família; falhas de arquivo ou layout viram ocorrência acionável. */
function interpretar(
  fonte: FonteImportacao,
  conteudo: Uint8Array,
):
  { ok: true; resultado: ResultadoLeitura } | { ok: false; erro: ErroLeitura } {
  try {
    const pasta = lerXlsx(conteudo);
    if (fonte === 'tabulacao_consolidado')
      return { ok: true, resultado: lerTabulacaoConsolidado(pasta) };
    throw new ErroLeitura(
      'FORMATO_NAO_HOMOLOGADO',
      'Fonte sem parser.',
      'Escolha uma fonte suportada.',
    );
  } catch (e) {
    if (e instanceof ErroLeitura) return { ok: false, erro: e };
    return {
      ok: false,
      erro: new ErroLeitura(
        'ARQUIVO_INVALIDO',
        'Falha inesperada ao ler o arquivo.',
        'Tente novamente; se persistir, envie uma nova cópia da planilha.',
      ),
    };
  }
}

@Injectable()
export class ImportacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
    private readonly conciliacao: ConciliacaoService,
  ) {}

  colecao(consulta: ConsultaColecao) {
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_LOTES_IMPORTACAO,
      mapa: MAPA_LOTES,
      escopo: [],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.importacaoLote.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.importacaoLote.count({ where }),
      mapear: paraLinha,
    });
  }

  private async existe(id: number) {
    const lote = await this.prisma.importacaoLote.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!lote) throw naoEncontrado();
  }

  async linhas(loteId: number, consulta: ConsultaColecao) {
    await this.existe(loteId);
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_LINHAS_IMPORTACAO,
      mapa: MAPA_LINHAS,
      escopo: [{ loteId }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.importacaoLinha.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.importacaoLinha.count({ where }),
      mapear: (l): LinhaImportacaoLinha => ({
        id: l.id,
        aba: l.aba,
        linha: l.linha,
        tipo: l.tipo as TipoLinhaImportacao,
        situacao: l.situacao as SituacaoLinhaImportacao,
        celulas: l.celulas as unknown as Record<string, CelulaBruta>,
        canonico: l.canonico as unknown as CanonicoLinha | null,
      }),
    });
  }

  async ocorrencias(loteId: number, consulta: ConsultaColecao) {
    await this.existe(loteId);
    return executarColecao({
      prisma: this.prisma,
      consulta,
      esquema: ESQUEMA_OCORRENCIAS_IMPORTACAO,
      mapa: MAPA_OCORRENCIAS,
      escopo: [{ loteId }],
      buscar: ({ where, orderBy, skip, take, db }) =>
        db.importacaoOcorrencia.findMany({ where, orderBy, skip, take }),
      contar: (where, db) => db.importacaoOcorrencia.count({ where }),
      mapear: (o): OcorrenciaImportacaoLinha => ({
        id: o.id,
        aba: o.aba,
        linha: o.linha,
        coluna: o.coluna,
        severidade: o.severidade as SeveridadeOcorrencia,
        codigo: o.codigo,
        mensagem: o.mensagem,
        orientacao: o.orientacao,
      }),
    });
  }

  async detalhe(id: number): Promise<LoteImportacaoDetalhe> {
    const lote = await this.prisma.importacaoLote.findUnique({ where: { id } });
    if (!lote) throw naoEncontrado();
    const [linhas, erros, avisos] = await Promise.all([
      this.prisma.importacaoLinha.count({ where: { loteId: id } }),
      this.prisma.importacaoOcorrencia.count({
        where: { loteId: id, severidade: 'erro' },
      }),
      this.prisma.importacaoOcorrencia.count({
        where: { loteId: id, severidade: 'aviso' },
      }),
    ]);
    const destino = await this.conciliacao.carregarDestino(
      this.prisma,
      lote.pesquisaId,
      lote.perguntaId,
    );
    return {
      ...paraLinha(lote),
      sha256: lote.sha256,
      destino: destino && {
        pesquisaId: destino.pesquisaId,
        perguntaId: destino.perguntaId,
        tituloPesquisa: destino.tituloPesquisa,
        rotuloPeriodo: destino.rotuloPeriodo,
        dataInicio: destino.dataInicio,
        dataFim: destino.dataFim,
      },
      confirmacao: lote.confirmacao as ConfirmacaoLote,
      confirmadoEm: lote.confirmadoEm?.toISOString() ?? null,
      recalculoPendente: lote.recalculoPendente,
      erroMensagem: lote.erroMensagem,
      resumo: lote.resumo as unknown as ResumoLeitura | null,
      totais: { linhas, erros, avisos },
    };
  }

  /** Guarda o original e cria o lote; a leitura roda em seguida e pode ser repetida. */
  async receber(
    contexto: ContextoAcesso,
    fonte: FonteImportacao,
    nomeArquivo: string,
    conteudo: Buffer,
  ) {
    if (conteudo.length === 0) throw arquivoVazio();
    if (conteudo.length > LIMITES_IMPORTACAO.tamanhoMaximoBytes)
      throw arquivoMuitoGrande();
    const sha256 = createHash('sha256').update(conteudo).digest('hex');
    const id = await this.autorizacao.executar(
      contexto,
      'importacoes',
      'criar',
      async (tx, atual) => {
        const existente = await tx.importacaoLote.findUnique({
          where: { fonte_sha256: { fonte, sha256 } },
          select: { id: true },
        });
        if (existente) throw arquivoJaRecebido(existente.id);
        const lote = await tx.importacaoLote.create({
          data: {
            fonte,
            nomeArquivo,
            tamanhoBytes: conteudo.length,
            sha256,
            versaoParser: VERSOES_PARSER[fonte],
            estado: 'recebido',
            criadoPor: atual.usuario.id,
            arquivo: { create: { conteudo: new Uint8Array(conteudo) } },
          },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'importacao_lote',
          entidadeId: lote.id,
          acao: 'criar',
          depois: {
            fonte,
            nomeArquivo,
            tamanhoBytes: conteudo.length,
            sha256,
            versaoParser: lote.versaoParser,
            estado: 'recebido',
          },
        });
        return lote.id;
      },
    );
    return this.ler(contexto, id);
  }

  /** (Re)lê o original preservado. Substitui apenas linhas e ocorrências do próprio lote. */
  async ler(
    contexto: ContextoAcesso,
    id: number,
  ): Promise<LoteImportacaoDetalhe> {
    const { fonte, conteudo } = await this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM importacao_lote WHERE id = ${id} FOR UPDATE`;
        const lote = await tx.importacaoLote.findUnique({
          where: { id },
          include: { arquivo: true },
        });
        if (!lote || !lote.arquivo) throw naoEncontrado();
        const emCurso =
          lote.estado === 'lendo' &&
          Date.now() - (lote.lidoEm ?? lote.criadoEm).getTime() <
            PRAZO_LEITURA_MS;
        if (emCurso) throw leituraEmAndamento();
        await tx.importacaoLote.update({
          where: { id },
          data: { estado: 'lendo', lidoEm: new Date() },
        });
        return {
          fonte: lote.fonte as FonteImportacao,
          conteudo: lote.arquivo.conteudo,
        };
      },
    );

    // Leitura fora da transação do banco: nada é gravado até o resultado estar completo.
    const leitura = interpretar(fonte, conteudo);

    await this.autorizacao.executar(
      contexto,
      'importacoes',
      'alterar',
      async (tx, atual) => {
        await tx.importacaoLinha.deleteMany({ where: { loteId: id } });
        await tx.importacaoOcorrencia.deleteMany({ where: { loteId: id } });
        let estado: EstadoLote;
        let erroMensagem: string | null = null;
        let resumo: ResumoLeitura | null = null;
        let linhas = 0;
        let erros: number;
        let avisos = 0;
        if (leitura.ok) {
          const r = leitura.resultado;
          estado = 'lido';
          resumo = r.resumo;
          linhas = r.linhas.length;
          erros = r.ocorrencias.filter((o) => o.severidade === 'erro').length;
          avisos = r.ocorrencias.length - erros;
          if (r.linhas.length > LIMITES_IMPORTACAO.linhasMaximas) {
            throw new Error('Limite de linhas excedido.');
          }
          await tx.importacaoLinha.createMany({
            data: r.linhas.map((l) => ({
              loteId: id,
              aba: l.aba,
              linha: l.linha,
              tipo: l.tipo,
              situacao: l.situacao,
              celulas: l.celulas as unknown as Prisma.InputJsonValue,
              canonico: (l.canonico ?? undefined) as
                Prisma.InputJsonValue | undefined,
            })),
          });
          await tx.importacaoOcorrencia.createMany({
            data: r.ocorrencias.map((o) => ({ loteId: id, ...o })),
          });
        } else {
          estado = 'erro';
          erroMensagem = leitura.erro.message;
          erros = 1;
          await tx.importacaoOcorrencia.create({
            data: {
              loteId: id,
              aba: null,
              linha: null,
              coluna: null,
              severidade: 'erro',
              codigo: leitura.erro.codigo,
              mensagem: leitura.erro.message,
              orientacao: leitura.erro.orientacao,
            },
          });
        }
        await tx.importacaoLote.update({
          where: { id },
          data: {
            estado,
            lidoEm: new Date(),
            erroMensagem,
            resumo: (resumo ?? undefined) as unknown as
              Prisma.InputJsonValue | undefined,
          },
        });
        await registrarAuditoria(tx, {
          usuarioId: atual.usuario.id,
          entidade: 'importacao_lote',
          entidadeId: id,
          acao: 'alterar',
          depois: { estado, linhas, erros, avisos },
        });
      },
    );
    return this.detalhe(id);
  }
}
