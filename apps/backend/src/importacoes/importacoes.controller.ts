import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import {
  CABECALHO_NOME_ARQUIVO,
  isFonteImportacao,
  normalizarNomeArquivo,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { ImportacoesService } from './importacoes.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class ImportacoesController {
  constructor(private readonly importacoes: ImportacoesService) {}

  /** Corpo binário (.xlsx); o nome original segue em `x-nome-arquivo`, codificado em URL. */
  @Post('importacoes')
  @HttpCode(201)
  @ExigirPermissao('importacoes', 'criar')
  async receber(
    @Req() req: RequisicaoAutenticada,
    @Query('fonte') fonte: unknown,
  ) {
    const erros = [];
    if (!isFonteImportacao(fonte))
      erros.push({
        field: 'fonte',
        message: 'Escolha uma fonte de planilha suportada.',
      });
    const cabecalho = req.headers[CABECALHO_NOME_ARQUIVO];
    const nome = normalizarNomeArquivo(
      Array.isArray(cabecalho) ? cabecalho[0] : cabecalho,
    );
    if (!nome.valido)
      erros.push({ field: 'nomeArquivo', message: nome.message });
    const corpo: unknown = (req as unknown as { body?: unknown }).body;
    if (!Buffer.isBuffer(corpo))
      erros.push({
        field: 'arquivo',
        message: 'Envie o arquivo como corpo binário da requisição.',
      });
    if (
      erros.length > 0 ||
      !isFonteImportacao(fonte) ||
      !nome.valido ||
      !Buffer.isBuffer(corpo)
    )
      throw entradaInvalidaCampos(erros);
    return {
      data: await this.importacoes.receber(req.acesso, fonte, nome.nome, corpo),
    };
  }

  @Get('importacoes/:id')
  @ExigirPermissao('importacoes', 'consultar')
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.importacoes.detalhe(id) };
  }

  /** Refaz a leitura do original preservado; não cria nem altera dados de negócio. */
  @Post('importacoes/:id/leituras')
  @HttpCode(200)
  @ExigirPermissao('importacoes', 'alterar')
  async reler(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.importacoes.ler(req.acesso, id) };
  }

  /** Exclui um lote ainda sem respostas gravadas; 409 `LOTE_CONFIRMADO` caso contrário. */
  @Delete('importacoes/:id')
  @HttpCode(204)
  @ExigirPermissao('importacoes', 'alterar')
  async excluir(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.importacoes.excluir(req.acesso, id);
  }
}
