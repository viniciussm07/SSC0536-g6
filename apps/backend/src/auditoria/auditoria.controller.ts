import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ExigirPermissao } from '../acesso/acesso.decorators';
import type { RequisicaoAutenticada } from '../acesso/acesso.types';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { AuditoriaService } from './auditoria.service';
@Controller('auditorias')
@UseFilters(AutenticacaoExceptionFilter)
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}
  @Get(':id')
  @ExigirPermissao('auditoria', 'consultar')
  async detalhe(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.auditoria.detalhe(req.acesso, id) };
  }
}
