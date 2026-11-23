import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import {
  validarEntradaExecucaoCalculo,
  validarEntradaPublicacaoCalculo,
} from '@ssc0536/common';
import type { ServerResponse } from 'node:http';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { CalculosService } from './calculos.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class CalculosController {
  constructor(private readonly calculos: CalculosService) {}

  @Get('calculos/:id')
  @ExigirPermissao('calculos', 'consultar', true)
  async detalhe(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.calculos.detalhe(id) };
  }

  /** 201 com a nova execução (concluída ou falha); 200 quando a última revisão é reaproveitada. */
  @Post('calculos')
  @ExigirPermissao('calculos', 'criar', true)
  async executar(
    @Req() req: RequisicaoAutenticada,
    @Body() corpo: unknown,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const entrada = validarEntradaExecucaoCalculo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    const data = await this.calculos.executar(req.acesso, entrada.data);
    res.statusCode = data.reaproveitada ? 200 : 201;
    return { data };
  }

  @Post('calculos/:id/retomada')
  @HttpCode(200)
  @ExigirPermissao('calculos', 'criar', true)
  async retomar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.calculos.retomar(req.acesso, id) };
  }

  @Post('calculos/:id/publicacao')
  @HttpCode(200)
  @ExigirPermissao('publicacoes', 'publicar', true)
  async publicar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const entrada = validarEntradaPublicacaoCalculo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.calculos.publicar(req.acesso, id, entrada.data) };
  }
}
