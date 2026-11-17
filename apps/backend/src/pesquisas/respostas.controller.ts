import type { ServerResponse } from 'node:http';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { validarEnvioResposta } from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ContextoEntidade, ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { entradaInvalidaCampos } from '../cadastro/cadastro.errors';
import { RespostasPesquisaService } from './respostas.service';

/** Formulário e envio da resposta no escopo do empreendimento contextualizado. */
@Controller('empreendimentos/:id/pesquisas/:pesquisaId')
@UseFilters(AutenticacaoExceptionFilter)
export class RespostasPesquisaController {
  constructor(private readonly respostas: RespostasPesquisaService) {}

  @Get()
  @ExigirPermissao('respostas', 'consultar')
  async formulario(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('pesquisaId', ParseIntPipe) pesquisaId: number,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return {
      data: await this.respostas.formulario(
        req.acesso,
        id,
        pesquisaId,
        contextoEntidade,
      ),
    };
  }

  /** 201 ao criar; 200 ao corrigir ou ao reenviar o mesmo conteúdo (sem nova gravação). */
  @Put('resposta')
  @ExigirPermissao('respostas', 'criar')
  async enviar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('pesquisaId', ParseIntPipe) pesquisaId: number,
    @Body() corpo: unknown,
    @ContextoEntidade() contextoEntidade: number | null,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const entrada = validarEnvioResposta(corpo);
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    const { criada, formulario } = await this.respostas.enviar(
      req.acesso,
      id,
      pesquisaId,
      entrada.data,
      contextoEntidade,
    );
    res.statusCode = criada ? 201 : 200;
    return { data: formulario };
  }
}
