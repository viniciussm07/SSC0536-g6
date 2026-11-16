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
import { validarEntradaPeriodo } from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { PeriodosService } from './periodos.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class PeriodosController {
  constructor(private readonly periodos: PeriodosService) {}

  @Get('periodos/:id')
  @ExigirPermissao('pesquisas', 'consultar')
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.periodos.detalhe(id) };
  }

  @Post('periodos')
  @HttpCode(201)
  @ExigirPermissao('pesquisas', 'criar')
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaPeriodo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.periodos.criar(req.acesso, entrada.data) };
  }

  @Put('periodos/:id')
  @ExigirPermissao('pesquisas', 'alterar')
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    return { data: await this.periodos.alterar(req.acesso, id, corpo) };
  }
}
