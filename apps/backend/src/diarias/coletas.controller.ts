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
  validarAlteracaoColetaDiaria,
  validarEntradaColetaDiaria,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { ColetasService } from './coletas.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class ColetasController {
  constructor(private readonly coletas: ColetasService) {}

  @Get('coletas-diarias/:id')
  @ExigirPermissao('calculos', 'consultar', true)
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.coletas.detalhe(id) };
  }

  @Post('coletas-diarias')
  @HttpCode(201)
  @ExigirPermissao('calculos', 'criar', true)
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaColetaDiaria(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.coletas.criar(req.acesso, entrada.data) };
  }

  @Put('coletas-diarias/:id')
  @ExigirPermissao('calculos', 'alterar', true)
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const entrada = validarAlteracaoColetaDiaria(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.coletas.alterar(req.acesso, id, entrada.data) };
  }
}
