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
import {
  validarAlteracaoRhcPeriodo,
  validarEntradaRhcPeriodo,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { RhcService } from './rhc.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class RhcController {
  constructor(private readonly rhc: RhcService) {}

  @Get('rhc-periodos/:id')
  @ExigirPermissao('calculos', 'consultar', true)
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.rhc.detalhe(id) };
  }

  @Post('rhc-periodos')
  @HttpCode(201)
  @ExigirPermissao('calculos', 'criar', true)
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaRhcPeriodo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.rhc.criar(req.acesso, entrada.data) };
  }

  @Put('rhc-periodos/:id')
  @ExigirPermissao('calculos', 'alterar', true)
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const entrada = validarAlteracaoRhcPeriodo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.rhc.alterar(req.acesso, id, entrada.data) };
  }
}
