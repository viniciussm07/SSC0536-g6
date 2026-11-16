import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseFilters,
} from '@nestjs/common';
import { validarAlteracaoModelo, validarEntradaModelo } from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { ModelosPesquisaService } from './modelos.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class ModelosPesquisaController {
  constructor(private readonly modelos: ModelosPesquisaService) {}

  @Get('modelos-pesquisa/:id')
  @ExigirPermissao('pesquisas', 'consultar')
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.modelos.detalhe(id) };
  }

  @Post('modelos-pesquisa')
  @HttpCode(201)
  @ExigirPermissao('pesquisas', 'criar')
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaModelo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.modelos.criar(req.acesso, entrada.data) };
  }

  @Put('modelos-pesquisa/:id')
  @ExigirPermissao('pesquisas', 'alterar')
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const alteracao = validarAlteracaoModelo(corpo);
    if (!alteracao.valido) throw entradaInvalidaCampos(alteracao.erros);
    return { data: await this.modelos.alterar(req.acesso, id, alteracao.data) };
  }
}
