import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  Res,
  UseFilters,
  type Type,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import {
  colunasCsv,
  interpretarContextoEntidade,
  CABECALHO_CONTEXTO,
  type DefinicaoColecao,
} from '@ssc0536/common';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ServerResponse } from 'node:http';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import { AutorizacaoService } from '../acesso/autorizacao.service';
import {
  contextoInvalido,
  entradaInvalida,
  naoEncontrado,
} from '../acesso/acesso.errors';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import {
  lerConsultaColecao,
  type ConsultaColecao,
} from '../odata/odata.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { exportacaoAtual, celulaCsv, linhaCsv } from './csv';

export interface EntradaColecao {
  req: RequisicaoAutenticada;
  parametros: Record<string, number>;
  consulta: ConsultaColecao;
  contexto: number | null;
  exportar: boolean;
}
/** Registra uma coleção uma vez; a flag compartilhada acrescenta a rota CSV. */
export function controllerColecao<S>(
  colecao: DefinicaoColecao,
  servico: Type<S>,
  ler: (servico: S, entrada: EntradaColecao) => Promise<unknown>,
): Type<unknown> {
  @Controller(colecao.caminho.replace(/^\//, ''))
  @UseFilters(AutenticacaoExceptionFilter)
  class ColecaoController {
    constructor(@Inject(servico) private readonly leitor: S) {}
    protected entrada(
      req: RequisicaoAutenticada,
      parametros: Record<string, string>,
      query: Record<string, unknown>,
      exportar: boolean,
    ): EntradaColecao {
      const ids: Record<string, number> = {};
      for (const [chave, valor] of Object.entries(parametros)) {
        if (
          !/^\d+$/.test(valor) ||
          !Number.isSafeInteger(Number(valor)) ||
          Number(valor) < 1 ||
          Number(valor) > 2147483647
        )
          throw entradaInvalida('Identificador inválido.');
        ids[chave] = Number(valor);
      }
      const contexto = interpretarContextoEntidade(
        req.headers[CABECALHO_CONTEXTO],
      );
      if (!contexto.valido) throw contextoInvalido();
      if (
        exportar &&
        Object.keys(query).some((k) => !['$filter', '$orderby'].includes(k))
      )
        throw entradaInvalida(
          'A exportação aceita somente filtros e ordenação.',
        );
      return {
        req,
        parametros: ids,
        contexto: contexto.id,
        exportar,
        consulta: lerConsultaColecao(query, { esquema: colecao.esquema }),
      };
    }
    @Get()
    @ExigirPermissao(colecao.recursoAcesso, 'consultar')
    listar(
      @Req() req: RequisicaoAutenticada,
      @Param() parametros: Record<string, string>,
      @Query() query: Record<string, unknown>,
    ) {
      return ler(this.leitor, this.entrada(req, parametros, query, false));
    }
  }
  if (!colecao.exportacao) return ColecaoController;
  @Controller(colecao.caminho.replace(/^\//, ''))
  @UseFilters(AutenticacaoExceptionFilter)
  class ColecaoExportavelController extends ColecaoController {
    constructor(
      @Inject(servico) private readonly exportador: S,
      private readonly autorizacao: AutorizacaoService,
      private readonly prisma: PrismaService,
    ) {
      super(exportador);
    }
    @Get('exportacoes')
    @ExigirPermissao(colecao.recursoAcesso, 'exportar')
    async exportar(
      @Req() req: RequisicaoAutenticada,
      @Param() parametros: Record<string, string>,
      @Query() query: Record<string, unknown>,
      @Res({ passthrough: true }) res: ServerResponse,
    ) {
      await this.autorizacao.exigir(
        req.acesso,
        colecao.recursoAcesso,
        'consultar',
      );
      const entrada = this.entradaExportacao(req, parametros, query);
      // Intersecta o escopo de exportação com a consulta em todas as coleções aninhadas.
      if (colecao.contexto) {
        const filtro = await this.autorizacao.filtroEmpreendimentos(
          req.acesso,
          colecao.recursoAcesso,
          'exportar',
        );
        const permitido = await this.prisma.empreendimento.findFirst({
          where: { AND: [{ id: entrada.parametros.id }, filtro] },
          select: { id: true },
        });
        if (!permitido) throw naoEncontrado();
      }
      const cancelamento = new AbortController();
      const cancelar = () => {
        if (!res.writableFinished) cancelamento.abort();
      };
      res.once('close', cancelar);
      const diretorio = await mkdtemp(join(tmpdir(), 'oto-csv-'));
      const arquivo = join(diretorio, 'exportacao.csv');
      const limpar = async () => {
        res.off('close', cancelar);
        await rm(diretorio, { recursive: true, force: true });
      };
      try {
        const handle = await open(arquivo, 'w', 0o600);
        const colunas = colunasCsv(colecao);
        try {
          await handle.writeFile(
            '\uFEFF' +
              colunas.map((c) => celulaCsv(c.rotulo)).join(';') +
              '\r\n',
          );
          await exportacaoAtual.run(
            {
              signal: cancelamento.signal,
              escrever: async (linhas) => {
                cancelamento.signal.throwIfAborted();
                await handle.writeFile(
                  linhas
                    .map((linha) => linhaCsv(linha, colunas, colecao.esquema))
                    .join(''),
                );
              },
            },
            () => ler(this.exportador, entrada),
          );
        } finally {
          await handle.close();
        }
        cancelamento.signal.throwIfAborted();
        const configuracao = colecao.exportacao;
        const base =
          typeof configuracao === 'object'
            ? configuracao.nomeArquivo
            : undefined;
        const nome =
          (base ?? colecao.esquema.recurso).replace(/[^a-zA-Z0-9._-]/g, '-') +
          '.csv';
        res.setHeader('Cache-Control', 'no-store');
        const stream = createReadStream(arquivo);
        stream.once('close', () => void limpar());
        res.once('close', () => stream.destroy());
        return new StreamableFile(stream, {
          type: 'text/csv; charset=utf-8',
          disposition: `attachment; filename="${nome}"`,
        });
      } catch (erro) {
        await limpar();
        throw erro;
      }
    }
    private entradaExportacao(
      req: RequisicaoAutenticada,
      parametros: Record<string, string>,
      query: Record<string, unknown>,
    ) {
      return this.entrada(req, parametros, query, true);
    }
  }
  return ColecaoExportavelController;
}
