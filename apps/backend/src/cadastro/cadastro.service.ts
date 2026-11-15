import { Injectable } from '@nestjs/common';
import {
  CAMPOS_RESERVADOS_EQUIPE,
  validarConsistenciaCadastro,
  type AlteracaoEmpreendimento,
  type CadasturEntrada,
  type ContatoEntrada,
  type EmpreendimentoDetalhe,
  type EntradaEmpreendimento,
  type ErroCampo,
  type SegmentoResumo,
} from '@ssc0536/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import type { ContextoAcesso } from '../acesso/acesso.types';
import {
  acessoNegado,
  contextoDivergente,
  contextoObrigatorio,
  naoEncontrado,
} from '../acesso/acesso.errors';
import {
  campoRestrito,
  duplicidadePotencial,
  entradaInvalidaCampos,
} from './cadastro.errors';
import { buscarCandidatos } from './duplicidade';
import { lerDetalhe } from './cadastro.leitura';

type Tx = Prisma.TransactionClient;
const data = (texto: string | null | undefined) =>
  texto ? new Date(`${texto}T00:00:00.000Z`) : null;
/** Garante JSON puro (sem Date/undefined) para o snapshot de auditoria. */
const json = (valor: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(valor ?? null)) as Prisma.InputJsonValue;
const igual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

// Campos do detalhe comparados para registrar o que mudou (pendências são derivadas).
const CAMPOS_AUDITADOS = [
  'nomeFantasia',
  'razaoSocial',
  'cnpj',
  'idOrigem',
  'situacao',
  'tipoHospedagem',
  'categoriaIndicador',
  'endereco',
  'zona',
  'localizacao',
  'dataInicioAtividades',
  'dataEncerramento',
  'segmentos',
  'contatos',
  'cadastur',
] as const;

@Injectable()
export class CadastroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async segmentos(): Promise<SegmentoResumo[]> {
    const linhas = await this.prisma.segmento.findMany({
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    });
    return linhas.map(({ id, chave, nome, nivelCadastro }) => ({
      id,
      chave,
      nome,
      nivelCadastro,
    }));
  }

  async criar(
    contexto: ContextoAcesso,
    entrada: EntradaEmpreendimento,
  ): Promise<EmpreendimentoDetalhe> {
    return this.autorizacao.executar(
      contexto,
      'empreendimentos',
      'criar',
      async (tx, atual, escopo) => {
        // Criar cadastros é da equipe; vínculo de empresário não autoriza cadastro novo.
        if (escopo !== 'todos') throw acessoNegado();
        this.exigirConsistencia({
          situacao: entrada.situacao,
          cnpj: entrada.cnpj ?? null,
          dataInicioAtividades: entrada.dataInicioAtividades ?? null,
          dataEncerramento: entrada.dataEncerramento ?? null,
          cadastur: entrada.cadastur ?? [],
        });
        await this.exigirSegmentos(tx, entrada.segmentoIds);
        const candidatos = await buscarCandidatos(tx, entrada);
        if (candidatos.length && !entrada.confirmarSemDuplicidade)
          throw duplicidadePotencial(candidatos);
        const criado = await tx.empreendimento.create({
          data: {
            nomeFantasia: entrada.nomeFantasia,
            razaoSocial: entrada.razaoSocial ?? null,
            cnpj: entrada.cnpj ?? null,
            idOrigem: entrada.idOrigem ?? null,
            tipoHospedagem: entrada.tipoHospedagem ?? null,
            categoriaIndicador: entrada.categoriaIndicador ?? null,
            endereco: entrada.endereco ?? null,
            zona: entrada.zona ?? null,
            situacao: entrada.situacao,
            dataInicioAtividades: data(entrada.dataInicioAtividades),
            dataEncerramento: data(entrada.dataEncerramento),
            segmentos: {
              create: entrada.segmentoIds.map((segmentoId) => ({ segmentoId })),
            },
            contatos: { create: (entrada.contatos ?? []).map(this.contato) },
            cadastur: {
              create: (entrada.cadastur ?? []).map(this.registroCadastur),
            },
          },
          select: { id: true },
        });
        if (entrada.localizacao)
          await this.gravarLocalizacao(tx, criado.id, entrada.localizacao);
        const depois = (await lerDetalhe(tx, criado.id))!;
        await tx.auditoria.create({
          data: {
            usuarioId: atual.usuario.id,
            entidade: 'empreendimento',
            entidadeId: criado.id,
            acao: 'criar',
            depois: json({
              ...Object.fromEntries(
                CAMPOS_AUDITADOS.map((campo) => [campo, depois[campo]]),
              ),
              ...(candidatos.length
                ? { duplicidadesConfirmadas: candidatos.map((c) => c.id) }
                : {}),
            }),
            em: new Date(),
          },
        });
        return depois;
      },
    );
  }

  async alterar(
    contexto: ContextoAcesso,
    id: number,
    entrada: AlteracaoEmpreendimento,
    contextoEntidade: number | null,
  ): Promise<EmpreendimentoDetalhe> {
    if (contextoEntidade === null) throw contextoObrigatorio();
    return this.autorizacao.executar(
      contexto,
      'empreendimentos',
      'alterar',
      async (tx, atual, escopo) => {
        const filtro = await this.autorizacao.filtroEmpreendimentos(
          atual,
          'empreendimentos',
          'alterar',
          tx,
        );
        // Vínculo e escopo primeiro (404 sem confirmar existência); só depois o contexto.
        if (
          !(await tx.empreendimento.findFirst({
            where: { AND: [{ id }, filtro] },
            select: { id: true },
          }))
        )
          throw naoEncontrado();
        if (contextoEntidade !== id) throw contextoDivergente();
        if (escopo !== 'todos') {
          const proibidos = CAMPOS_RESERVADOS_EQUIPE.filter(
            (campo) => entrada[campo] !== undefined,
          );
          if (proibidos.length) throw campoRestrito(proibidos);
        }
        // Serializa edições concorrentes do mesmo cadastro.
        await tx.$queryRaw`SELECT id FROM empreendimento WHERE id = ${id} FOR UPDATE`;
        const antes = (await lerDetalhe(tx, id))!;

        const final = {
          situacao:
            entrada.situacao ?? (antes.situacao as 'ativo' | 'encerrado'),
          cnpj: entrada.cnpj !== undefined ? entrada.cnpj : antes.cnpj,
          dataInicioAtividades:
            entrada.dataInicioAtividades !== undefined
              ? entrada.dataInicioAtividades
              : antes.dataInicioAtividades,
          dataEncerramento:
            entrada.dataEncerramento !== undefined
              ? entrada.dataEncerramento
              : antes.dataEncerramento,
          cadastur: entrada.cadastur ?? antes.cadastur,
        };
        this.exigirConsistencia(final);
        if (entrada.segmentoIds)
          await this.exigirSegmentos(tx, entrada.segmentoIds);
        this.exigirPropriedade(
          entrada.contatos,
          antes.contatos.map((c) => c.id),
          'contatos',
        );
        this.exigirPropriedade(
          entrada.cadastur,
          antes.cadastur.map((c) => c.id),
          'cadastur',
        );

        const identificacaoMudou =
          (entrada.nomeFantasia !== undefined &&
            entrada.nomeFantasia !== antes.nomeFantasia) ||
          (entrada.cnpj !== undefined && entrada.cnpj !== antes.cnpj) ||
          (entrada.idOrigem !== undefined &&
            entrada.idOrigem !== antes.idOrigem);
        let candidatos: Awaited<ReturnType<typeof buscarCandidatos>> = [];
        if (identificacaoMudou) {
          candidatos = await buscarCandidatos(
            tx,
            {
              nomeFantasia:
                entrada.nomeFantasia !== undefined &&
                entrada.nomeFantasia !== antes.nomeFantasia
                  ? entrada.nomeFantasia
                  : undefined,
              cnpj:
                entrada.cnpj !== undefined && entrada.cnpj !== antes.cnpj
                  ? entrada.cnpj
                  : undefined,
              idOrigem:
                entrada.idOrigem !== undefined &&
                entrada.idOrigem !== antes.idOrigem
                  ? entrada.idOrigem
                  : undefined,
            },
            id,
          );
          if (candidatos.length && !entrada.confirmarSemDuplicidade)
            throw duplicidadePotencial(candidatos);
        }

        const escalares: Prisma.EmpreendimentoUpdateInput = {
          ...(entrada.nomeFantasia !== undefined && {
            nomeFantasia: entrada.nomeFantasia,
          }),
          ...(entrada.situacao !== undefined && { situacao: entrada.situacao }),
          ...(entrada.razaoSocial !== undefined && {
            razaoSocial: entrada.razaoSocial,
          }),
          ...(entrada.cnpj !== undefined && { cnpj: entrada.cnpj }),
          ...(entrada.idOrigem !== undefined && { idOrigem: entrada.idOrigem }),
          ...(entrada.tipoHospedagem !== undefined && {
            tipoHospedagem: entrada.tipoHospedagem,
          }),
          ...(entrada.categoriaIndicador !== undefined && {
            categoriaIndicador: entrada.categoriaIndicador,
          }),
          ...(entrada.endereco !== undefined && { endereco: entrada.endereco }),
          ...(entrada.zona !== undefined && { zona: entrada.zona }),
          ...(entrada.dataInicioAtividades !== undefined && {
            dataInicioAtividades: data(entrada.dataInicioAtividades),
          }),
          ...(entrada.dataEncerramento !== undefined && {
            dataEncerramento: data(entrada.dataEncerramento),
          }),
        };
        if (Object.keys(escalares).length)
          await tx.empreendimento.update({ where: { id }, data: escalares });
        if (entrada.localizacao !== undefined)
          await this.gravarLocalizacao(tx, id, entrada.localizacao);
        if (entrada.segmentoIds) {
          await tx.empreendimentoSegmento.deleteMany({
            where: {
              empreendimentoId: id,
              segmentoId: { notIn: entrada.segmentoIds },
            },
          });
          await tx.empreendimentoSegmento.createMany({
            data: entrada.segmentoIds.map((segmentoId) => ({
              empreendimentoId: id,
              segmentoId,
            })),
            skipDuplicates: true,
          });
        }
        if (entrada.contatos)
          await this.sincronizarContatos(tx, id, entrada.contatos);
        if (entrada.cadastur)
          await this.sincronizarCadastur(tx, id, entrada.cadastur);

        const depois = (await lerDetalhe(tx, id))!;
        const mudou = CAMPOS_AUDITADOS.filter(
          (campo) => !igual(antes[campo], depois[campo]),
        );
        if (mudou.length)
          await tx.auditoria.create({
            data: {
              usuarioId: atual.usuario.id,
              entidade: 'empreendimento',
              entidadeId: id,
              acao: 'alterar',
              antes: json(Object.fromEntries(mudou.map((c) => [c, antes[c]]))),
              depois: json({
                ...Object.fromEntries(mudou.map((c) => [c, depois[c]])),
                ...(candidatos.length
                  ? { duplicidadesConfirmadas: candidatos.map((c) => c.id) }
                  : {}),
              }),
              em: new Date(),
            },
          });
        return depois;
      },
    );
  }

  private exigirConsistencia(
    estado: Parameters<typeof validarConsistenciaCadastro>[0],
  ) {
    const erros = validarConsistenciaCadastro(estado);
    if (erros.length) throw entradaInvalidaCampos(erros);
  }

  private async exigirSegmentos(tx: Tx, ids: number[]) {
    const existentes = await tx.segmento.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const faltam = ids.filter((i) => !existentes.some((s) => s.id === i));
    if (faltam.length)
      throw entradaInvalidaCampos([
        {
          field: 'segmentoIds',
          message: `Segmento inexistente: ${faltam.join(', ')}.`,
        },
      ]);
  }

  /** IDs informados em contatos/Cadastur precisam pertencer a este cadastro. */
  private exigirPropriedade(
    itens: { id?: number }[] | undefined,
    permitidos: number[],
    campo: string,
  ) {
    const erros: ErroCampo[] = [];
    itens?.forEach((item, i) => {
      if (item.id !== undefined && !permitidos.includes(item.id))
        erros.push({
          field: `${campo}[${i}].id`,
          message: 'Registro não pertence a este empreendimento.',
        });
    });
    if (erros.length) throw entradaInvalidaCampos(erros);
  }

  private contato = (c: ContatoEntrada) => ({
    tipo: c.tipo,
    valor: c.valor,
    finalidade: c.finalidade,
    responsavelNome: c.responsavelNome ?? null,
    responsavelCargo: c.responsavelCargo ?? null,
  });
  private registroCadastur = (c: CadasturEntrada) => ({
    situacao: c.situacao,
    numero: c.numero ?? null,
    vencimento: data(c.vencimento),
  });

  private async sincronizarContatos(
    tx: Tx,
    id: number,
    contatos: ContatoEntrada[],
  ) {
    await tx.contato.deleteMany({
      where: {
        empreendimentoId: id,
        id: { notIn: contatos.flatMap((c) => (c.id ? [c.id] : [])) },
      },
    });
    for (const c of contatos)
      if (c.id)
        await tx.contato.update({ where: { id: c.id }, data: this.contato(c) });
      else
        await tx.contato.create({
          data: { empreendimentoId: id, ...this.contato(c) },
        });
  }

  private async sincronizarCadastur(
    tx: Tx,
    id: number,
    registros: CadasturEntrada[],
  ) {
    await tx.cadastur.deleteMany({
      where: {
        empreendimentoId: id,
        id: { notIn: registros.flatMap((c) => (c.id ? [c.id] : [])) },
      },
    });
    for (const c of registros)
      if (c.id)
        await tx.cadastur.update({
          where: { id: c.id },
          data: this.registroCadastur(c),
        });
      else
        await tx.cadastur.create({
          data: { empreendimentoId: id, ...this.registroCadastur(c) },
        });
  }

  /** WGS84 (SRID 4326), ordem longitude/latitude; null limpa. SQL parametrizado. */
  private async gravarLocalizacao(
    tx: Tx,
    id: number,
    local: { longitude: number; latitude: number } | null,
  ) {
    if (local)
      await tx.$executeRaw`UPDATE empreendimento
        SET localizacao = ST_SetSRID(ST_MakePoint(${local.longitude}, ${local.latitude}), 4326)::geography
        WHERE id = ${id}`;
    else
      await tx.$executeRaw`UPDATE empreendimento SET localizacao = NULL WHERE id = ${id}`;
  }
}
