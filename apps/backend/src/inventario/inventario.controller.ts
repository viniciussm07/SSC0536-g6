import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import {
  validarEntradaConferenciaInventario,
  validarEntradaVersaoInventario,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ContextoEntidade, ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { InventarioService } from './inventario.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class InventarioController {
  constructor(private readonly inventario: InventarioService) {}

  /** Capacidade e itens válidos na data (`?data=AAAA-MM-DD`, padrão hoje); `data: null` sem versão. */
  @Get('empreendimentos/:id/inventarios/vigente')
  @ExigirPermissao('inventarios', 'consultar')
  async vigente(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @ContextoEntidade() contextoEntidade: number | null,
    @Query('data') dataConsulta?: string,
  ) {
    if (dataConsulta !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dataConsulta))
      throw new BadRequestException({
        error: {
          code: 'ENTRADA_INVALIDA',
          message: 'Confira os parâmetros informados.',
          details: [{ field: 'data', message: 'Use AAAA-MM-DD.' }],
        },
      });
    return {
      data: await this.inventario.vigente(
        req.acesso,
        id,
        dataConsulta,
        contextoEntidade,
      ),
    };
  }

  @Get('empreendimentos/:id/inventarios/:versaoId')
  @ExigirPermissao('inventarios', 'consultar')
  async detalhe(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('versaoId', ParseIntPipe) versaoId: number,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return {
      data: await this.inventario.detalhe(
        req.acesso,
        id,
        versaoId,
        contextoEntidade,
      ),
    };
  }

  @Post('empreendimentos/:id/inventarios')
  @HttpCode(201)
  @ExigirPermissao('inventarios', 'criar')
  async criar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    const entrada = validarEntradaVersaoInventario(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.inventario.criarVersao(
        req.acesso,
        id,
        entrada.data,
        contextoEntidade,
      ),
    };
  }

  @Put('empreendimentos/:id/inventarios/:versaoId/conferencia')
  @ExigirPermissao('inventarios', 'alterar')
  async conferir(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('versaoId', ParseIntPipe) versaoId: number,
    @Body() corpo: unknown,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    const entrada = validarEntradaConferenciaInventario(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.inventario.conferir(
        req.acesso,
        id,
        versaoId,
        entrada.data,
        contextoEntidade,
      ),
    };
  }
}
