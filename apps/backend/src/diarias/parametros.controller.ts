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
  validarAlteracaoParametroCalculo,
  validarEntradaParametroCalculo,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { ParametrosService } from './parametros.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class ParametrosController {
  constructor(private readonly parametros: ParametrosService) {}

  @Get('parametros-calculo/:id')
  @ExigirPermissao('calculos', 'consultar', true)
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.parametros.detalhe(id) };
  }

  @Post('parametros-calculo')
  @HttpCode(201)
  @ExigirPermissao('calculos', 'criar', true)
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaParametroCalculo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.parametros.criar(req.acesso, entrada.data) };
  }

  @Put('parametros-calculo/:id')
  @ExigirPermissao('calculos', 'alterar', true)
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const entrada = validarAlteracaoParametroCalculo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.parametros.alterar(req.acesso, id, entrada.data),
    };
  }
}
