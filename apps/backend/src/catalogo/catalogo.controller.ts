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
  ESQUEMA_CATALOGO_GRUPOS,
  ESQUEMA_CATALOGO_ITENS,
  ESQUEMA_CATALOGO_VERSOES,
  validarAlteracaoGrupoCatalogo,
  validarAlteracaoItemCatalogo,
  validarEntradaGrupoCatalogo,
  validarEntradaItemCatalogo,
} from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import {
  ConsultaDaColecao,
  type ConsultaColecao,
} from '../odata/odata.decorators';
import { CatalogoService } from './catalogo.service';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  /** Formulário do segmento (grupos e itens ativos); `incluirInativos` exige `catalogos:consultar`. */
  @Get('segmentos/:id/catalogo')
  @ExigirPermissao('inventarios', 'consultar')
  async formulario(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Query('incluirInativos') incluirInativos?: string,
  ) {
    if (
      incluirInativos !== undefined &&
      incluirInativos !== 'true' &&
      incluirInativos !== 'false'
    )
      throw new BadRequestException({
        error: {
          code: 'ENTRADA_INVALIDA',
          message: 'Confira os parâmetros informados.',
          details: [
            { field: 'incluirInativos', message: 'Use true ou false.' },
          ],
        },
      });
    return {
      data: await this.catalogo.formulario(
        req.acesso,
        id,
        incluirInativos === 'true',
      ),
    };
  }

  /** Valida seleções contra o catálogo ativo (mesmas regras do inventário e da importação). */
  @Post('segmentos/:id/catalogo/validacoes')
  @HttpCode(200)
  @ExigirPermissao('inventarios', 'criar')
  async validar(@Param('id', ParseIntPipe) id: number, @Body() corpo: unknown) {
    return { data: await this.catalogo.validar(id, corpo) };
  }

  @Get('catalogos/grupos')
  @ExigirPermissao('catalogos', 'consultar')
  async grupos(
    @ConsultaDaColecao({ esquema: ESQUEMA_CATALOGO_GRUPOS })
    consulta: ConsultaColecao,
  ) {
    return this.catalogo.grupoColecao(consulta);
  }

  @Get('catalogos/itens')
  @ExigirPermissao('catalogos', 'consultar')
  async itens(
    @ConsultaDaColecao({ esquema: ESQUEMA_CATALOGO_ITENS })
    consulta: ConsultaColecao,
  ) {
    return this.catalogo.itemColecao(consulta);
  }

  @Get('catalogos/itens/:id/versoes')
  @ExigirPermissao('catalogos', 'consultar')
  async versoes(
    @Param('id', ParseIntPipe) id: number,
    @ConsultaDaColecao({ esquema: ESQUEMA_CATALOGO_VERSOES })
    consulta: ConsultaColecao,
  ) {
    return this.catalogo.versoes(id, consulta);
  }

  @Post('catalogos/grupos')
  @HttpCode(201)
  @ExigirPermissao('catalogos', 'criar')
  async criarGrupo(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaGrupoCatalogo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.catalogo.criarGrupo(req.acesso, entrada.data) };
  }

  @Put('catalogos/grupos/:id')
  @ExigirPermissao('catalogos', 'alterar')
  async alterarGrupo(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const entrada = validarAlteracaoGrupoCatalogo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.catalogo.alterarGrupo(req.acesso, id, entrada.data),
    };
  }

  @Post('catalogos/itens')
  @HttpCode(201)
  @ExigirPermissao('catalogos', 'criar')
  async criarItem(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaItemCatalogo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.catalogo.criarItem(req.acesso, entrada.data) };
  }

  @Put('catalogos/itens/:id')
  @ExigirPermissao('catalogos', 'alterar')
  async alterarItem(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
  ) {
    const entrada = validarAlteracaoItemCatalogo(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.catalogo.alterarItem(req.acesso, id, entrada.data),
    };
  }
}
