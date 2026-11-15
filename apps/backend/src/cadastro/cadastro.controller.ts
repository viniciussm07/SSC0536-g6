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
import { validarEntradaEmpreendimento } from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ContextoEntidade, ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { CadastroService } from './cadastro.service';
import { entradaInvalidaCampos } from './cadastro.errors';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class CadastroController {
  constructor(private readonly cadastro: CadastroService) {}

  @Get('segmentos')
  @ExigirPermissao('empreendimentos', 'consultar')
  async segmentos() {
    return { data: await this.cadastro.segmentos() };
  }

  @Post('empreendimentos')
  @HttpCode(201)
  @ExigirPermissao('empreendimentos', 'criar')
  async criar(@Req() req: RequisicaoAutenticada, @Body() corpo: unknown) {
    const entrada = validarEntradaEmpreendimento(corpo, 'criar');
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return { data: await this.cadastro.criar(req.acesso, entrada.data) };
  }

  @Put('empreendimentos/:id')
  @ExigirPermissao('empreendimentos', 'alterar')
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() corpo: unknown,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    const entrada = validarEntradaEmpreendimento(corpo, 'alterar');
    if (!entrada.valido) throw entradaInvalidaCampos(entrada.erros);
    return {
      data: await this.cadastro.alterar(
        req.acesso,
        id,
        entrada.data,
        contextoEntidade,
      ),
    };
  }
}
