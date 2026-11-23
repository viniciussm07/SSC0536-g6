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
  Res,
  UseFilters,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { ConciliacaoService } from './conciliacao.service';

/**
 * Conciliação e confirmação (parte 09). O plano é um relatório limitado pelo tamanho do lote
 * (até 5.000 linhas), não uma coleção paginada; as linhas brutas seguem em `/linhas` (OData).
 */
@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class ConciliacaoController {
  constructor(private readonly conciliacao: ConciliacaoService) {}

  @Put('importacoes/:id/destino')
  @ExigirPermissao('importacoes', 'alterar')
  async destino(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    return {
      data: await this.conciliacao.definirDestino(req.acesso, id, corpo),
    };
  }

  @Get('importacoes/:id/plano')
  @ExigirPermissao('importacoes', 'consultar')
  async plano(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.conciliacao.plano(id) };
  }

  @Put('importacoes/:id/linhas/:linhaId/decisao')
  @ExigirPermissao('importacoes', 'alterar')
  async decidir(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('linhaId', ParseIntPipe) linhaId: number,
    @Body() corpo: unknown,
  ) {
    return {
      data: await this.conciliacao.decidir(req.acesso, id, linhaId, corpo),
    };
  }

  @Delete('importacoes/:id/linhas/:linhaId/decisao')
  @HttpCode(204)
  @ExigirPermissao('importacoes', 'alterar')
  async removerDecisao(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('linhaId', ParseIntPipe) linhaId: number,
  ) {
    await this.conciliacao.removerDecisao(req.acesso, id, linhaId);
  }

  @Put('importacoes/:id/linhas/:linhaId/conflito')
  @ExigirPermissao('importacoes', 'alterar')
  async conflito(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('linhaId', ParseIntPipe) linhaId: number,
    @Body() corpo: unknown,
  ) {
    return {
      data: await this.conciliacao.resolverConflito(
        req.acesso,
        id,
        linhaId,
        corpo,
      ),
    };
  }

  @Post('importacoes/:id/confirmacoes')
  @HttpCode(200)
  @ExigirPermissao('importacoes', 'alterar')
  async confirmar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    return { data: await this.conciliacao.confirmar(req.acesso, id, corpo) };
  }

  /** Download das linhas não aceitas (CSV); exige a permissão de exportação. */
  @Get('importacoes/:id/rejeicoes')
  @ExigirPermissao('importacoes', 'exportar')
  async rejeicoes(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const csv = await this.conciliacao.rejeicoesCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rejeicoes-lote-${id}.csv"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    return csv;
  }
}
