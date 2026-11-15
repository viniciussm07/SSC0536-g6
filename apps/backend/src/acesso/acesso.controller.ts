import {
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
import { PERFIS } from '@ssc0536/common';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import { ExigirPermissao, RequerSessao } from './acesso.decorators';
import { AutorizacaoService } from './autorizacao.service';
import { ContasService } from './contas.service';
import { PoliticasService } from './politicas.service';
import { ConsultasAcessoService } from './consultas.service';
import {
  PaginaDto,
  CriarContaDto,
  AlterarContaDto,
  AlterarVinculoDto,
  AlterarPermissoesDto,
  AlterarVisibilidadeDto,
} from './acesso.dto';
import type { RequisicaoAutenticada } from './acesso.types';
import { entradaInvalida } from './acesso.errors';

@Controller()
@UseFilters(AutenticacaoExceptionFilter)
export class AcessoController {
  constructor(
    private readonly acesso: AutorizacaoService,
    private readonly contas: ContasService,
    private readonly politicas: PoliticasService,
    private readonly consultas: ConsultasAcessoService,
  ) {}
  @Get('acessos/atual')
  @RequerSessao()
  async atual(@Req() req: RequisicaoAutenticada) {
    return { data: await this.acesso.atual(req.acesso) };
  }

  @Get('contas')
  @ExigirPermissao('contas', 'consultar')
  listar(@Query() query: PaginaDto) {
    return this.contas.listar(query);
  }
  @Post('contas')
  @ExigirPermissao('contas', 'criar')
  async criar(@Req() req: RequisicaoAutenticada, @Body() body: CriarContaDto) {
    return { data: await this.contas.criar(req.acesso, body) };
  }
  @Put('contas/:id')
  @ExigirPermissao('contas', 'alterar')
  async alterar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AlterarContaDto,
  ) {
    return { data: await this.contas.alterar(req.acesso, id, body) };
  }
  @Post('contas/:id/ativacoes')
  @HttpCode(201)
  @ExigirPermissao('contas', 'alterar')
  async recuperar(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    if (
      typeof body !== 'object' ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length
    )
      throw entradaInvalida('Esta operação não recebe campos.');
    return { data: await this.contas.recuperar(req.acesso, id) };
  }
  @Get('contas/:id/vinculos')
  @ExigirPermissao('vinculos', 'consultar')
  vinculos(@Param('id', ParseIntPipe) id: number, @Query() query: PaginaDto) {
    return this.contas.vinculos(id, query);
  }
  @Put('contas/:id/vinculos/:empreendimentoId')
  @ExigirPermissao('vinculos', 'alterar')
  async vincular(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Param('empreendimentoId', ParseIntPipe) empreendimentoId: number,
    @Body() body: AlterarVinculoDto,
  ) {
    return {
      data: await this.contas.vincular(
        req.acesso,
        id,
        empreendimentoId,
        body.ativo,
      ),
    };
  }

  @Get('perfis')
  @ExigirPermissao('permissoes', 'consultar')
  perfis() {
    return { data: PERFIS };
  }
  @Get('perfis/:perfil/permissoes')
  @ExigirPermissao('permissoes', 'consultar')
  async permissoes(@Param('perfil') perfil: string) {
    return { data: await this.politicas.permissoes(perfil) };
  }
  @Put('perfis/:perfil/permissoes')
  @ExigirPermissao('permissoes', 'alterar')
  async alterarPermissoes(
    @Req() req: RequisicaoAutenticada,
    @Param('perfil') perfil: string,
    @Body() body: AlterarPermissoesDto,
  ) {
    return {
      data: await this.politicas.alterarPermissoes(
        req.acesso,
        perfil,
        body.permissoes,
      ),
    };
  }
  @Get('perfis/:perfil/visibilidades')
  @ExigirPermissao('visibilidade', 'consultar')
  visibilidades(@Param('perfil') perfil: string, @Query() query: PaginaDto) {
    return this.politicas.visibilidades(perfil, query);
  }
  @Put('perfis/:perfil/visibilidades/:id')
  @ExigirPermissao('visibilidade', 'alterar')
  async alterarVisibilidade(
    @Req() req: RequisicaoAutenticada,
    @Param('perfil') perfil: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AlterarVisibilidadeDto,
  ) {
    return {
      data: await this.politicas.alterarVisibilidade(
        req.acesso,
        perfil,
        id,
        body.permitido,
      ),
    };
  }

  @Get('empreendimentos')
  @ExigirPermissao('empreendimentos', 'consultar')
  empreendimentos(
    @Req() req: RequisicaoAutenticada,
    @Query() query: PaginaDto,
  ) {
    return this.consultas.empreendimentos(req.acesso, query);
  }
  @Get('empreendimentos/exportacoes')
  @ExigirPermissao('empreendimentos', 'exportar')
  exportarEmpreendimentos(
    @Req() req: RequisicaoAutenticada,
    @Query() query: PaginaDto,
  ) {
    return this.consultas.empreendimentos(req.acesso, query, true);
  }
  @Get('empreendimentos/:id')
  @ExigirPermissao('empreendimentos', 'consultar')
  async empreendimento(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.consultas.empreendimento(req.acesso, id) };
  }
  @Get('empreendimentos/:id/respostas')
  @ExigirPermissao('respostas', 'consultar')
  respostas(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginaDto,
  ) {
    return this.consultas.respostas(req.acesso, id, query);
  }
  @Get('empreendimentos/:id/inventarios')
  @ExigirPermissao('inventarios', 'consultar')
  inventarios(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginaDto,
  ) {
    return this.consultas.inventarios(req.acesso, id, query);
  }
  @Get('indicadores')
  @ExigirPermissao('indicadores', 'consultar')
  indicadores(@Req() req: RequisicaoAutenticada, @Query() query: PaginaDto) {
    return this.consultas.indicadores(req.acesso, query);
  }
  @Get('indicadores/exportacoes')
  @ExigirPermissao('indicadores', 'exportar')
  exportarIndicadores(
    @Req() req: RequisicaoAutenticada,
    @Query() query: PaginaDto,
  ) {
    return this.consultas.indicadores(req.acesso, query, true);
  }
}
