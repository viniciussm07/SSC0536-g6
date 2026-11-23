import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  StreamableFile,
  UseFilters,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import {
  validarConsultaExportacaoPainel,
  validarConsultaPainel,
  validarConsultaSerie,
} from '@ssc0536/common';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { gerarPdf, gerarXlsx, nomeArquivo } from './painel.exportacao';
import { PainelService } from './painel.service';

@Controller('indicadores/painel')
@UseFilters(AutenticacaoExceptionFilter)
export class PainelController {
  constructor(private readonly painel: PainelService) {}

  @Get('opcoes')
  @ExigirPermissao('indicadores', 'consultar', true)
  async opcoes(@Req() req: RequisicaoAutenticada) {
    return { data: await this.painel.opcoes(req.acesso) };
  }

  @Get('participacao')
  @ExigirPermissao('pesquisas', 'consultar', true)
  async participacao(
    @Req() req: RequisicaoAutenticada,
    @Query() query: unknown,
  ) {
    const entrada = validarConsultaSerie(query);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.painel.participacao(req.acesso, entrada.data.tipoColeta),
    };
  }

  @Get('serie')
  @ExigirPermissao('indicadores', 'consultar', true)
  async serie(@Req() req: RequisicaoAutenticada, @Query() query: unknown) {
    const entrada = validarConsultaSerie(query);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.painel.serie(req.acesso, entrada.data.tipoColeta),
    };
  }

  /** Mesma resposta do painel em arquivo; exige a permissão de exportar indicadores. */
  @Get('exportacao')
  @ExigirPermissao('indicadores', 'exportar', true)
  async exportar(
    @Req() req: RequisicaoAutenticada,
    @Query() query: unknown,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const entrada = validarConsultaExportacaoPainel(query);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    const { formato, ...consulta } = entrada.data;
    const painel = await this.painel.painel(req.acesso, consulta);
    res.setHeader('Cache-Control', 'no-store');
    const pdf = formato === 'pdf';
    return new StreamableFile(pdf ? gerarPdf(painel) : gerarXlsx(painel), {
      type: pdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${nomeArquivo(painel, formato)}"`,
    });
  }

  @Get()
  @ExigirPermissao('indicadores', 'consultar', true)
  async consultar(@Req() req: RequisicaoAutenticada, @Query() query: unknown) {
    const entrada = validarConsultaPainel(query);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.painel.painel(req.acesso, entrada.data) };
  }
}
