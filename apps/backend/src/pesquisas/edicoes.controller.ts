import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseFilters,
} from '@nestjs/common';
import {
  validarAlteracaoPesquisa,
  validarEntradaPesquisa,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { EdicoesPesquisaService } from './edicoes.service';

/** Ciclo das edições: rascunho → aberta → encerrada (reabertura pendente de regra). */
@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class EdicoesPesquisaController {
  constructor(private readonly edicoes: EdicoesPesquisaService) {}

  @Get('pesquisas/:id')
  @ExigirPermissao('pesquisas', 'consultar', true)
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.edicoes.detalhe(id) };
  }

  @Post('pesquisas')
  @HttpCode(201)
  @ExigirPermissao('pesquisas', 'criar', true)
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaPesquisa(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.edicoes.criar(req.acesso, entrada.data) };
  }

  @Put('pesquisas/:id')
  @ExigirPermissao('pesquisas', 'alterar', true)
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const alteracao = validarAlteracaoPesquisa(corpo);
    if (!alteracao.valido) throw entradaInvalidaCampos(alteracao.erros);
    return { data: await this.edicoes.alterar(req.acesso, id, alteracao.data) };
  }

  @Post('pesquisas/:id/abertura')
  @HttpCode(200)
  @ExigirPermissao('pesquisas', 'alterar', true)
  async abrir(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.edicoes.abrir(req.acesso, id) };
  }

  @Post('pesquisas/:id/encerramento')
  @HttpCode(200)
  @ExigirPermissao('pesquisas', 'alterar', true)
  async encerrar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.edicoes.encerrar(req.acesso, id) };
  }

  @Delete('pesquisas/:id')
  @HttpCode(204)
  @ExigirPermissao('pesquisas', 'alterar', true)
  async excluir(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.edicoes.excluir(req.acesso, id);
  }
}
