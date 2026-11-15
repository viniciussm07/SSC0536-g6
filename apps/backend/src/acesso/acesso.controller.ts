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
  ESQUEMA_CONTAS,
  ESQUEMA_CADASTUR,
  ESQUEMA_CONTATOS,
  ESQUEMA_EMPREENDIMENTOS,
  ESQUEMA_INDICADORES,
  ESQUEMA_INVENTARIOS,
  ESQUEMA_PERMISSOES,
  ESQUEMA_RESPOSTAS,
  ESQUEMA_VINCULOS_CONTA,
  ESQUEMA_VISIBILIDADES,
  PERFIS,
} from '@ssc0536/common';
import {
  ConsultaDaColecao,
  type ConsultaColecao,
} from '../odata/odata.decorators';
import { AutenticacaoExceptionFilter } from '../autenticacao/autenticacao.http';
import {
  ContextoEntidade,
  ExigirPermissao,
  RequerSessao,
} from './acesso.decorators';
import { AutorizacaoService } from './autorizacao.service';
import { ContasService } from './contas.service';
import { PoliticasService } from './politicas.service';
import { ConsultasAcessoService } from './consultas.service';
import {
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
  listar(
    @ConsultaDaColecao({ esquema: ESQUEMA_CONTAS }) consulta: ConsultaColecao,
  ) {
    return this.contas.listar(consulta);
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
  vinculos(
    @Param('id', ParseIntPipe) id: number,
    @ConsultaDaColecao({ esquema: ESQUEMA_VINCULOS_CONTA })
    consulta: ConsultaColecao,
  ) {
    return this.contas.vinculos(id, consulta);
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
  permissoes(
    @Param('perfil') perfil: string,
    @ConsultaDaColecao({ esquema: ESQUEMA_PERMISSOES })
    consulta: ConsultaColecao,
  ) {
    return this.politicas.permissoes(perfil, consulta);
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
  visibilidades(
    @Param('perfil') perfil: string,
    @ConsultaDaColecao({ esquema: ESQUEMA_VISIBILIDADES })
    consulta: ConsultaColecao,
  ) {
    return this.politicas.visibilidades(perfil, consulta);
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
    @ConsultaDaColecao({ esquema: ESQUEMA_EMPREENDIMENTOS })
    consulta: ConsultaColecao,
  ) {
    return this.consultas.empreendimentos(req.acesso, consulta);
  }
  @Get('empreendimentos/exportacoes')
  @ExigirPermissao('empreendimentos', 'exportar')
  exportarEmpreendimentos(
    @Req() req: RequisicaoAutenticada,
    @ConsultaDaColecao({ esquema: ESQUEMA_EMPREENDIMENTOS })
    consulta: ConsultaColecao,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return this.consultas.empreendimentos(
      req.acesso,
      consulta,
      true,
      contextoEntidade,
    );
  }
  @Get('empreendimentos/:id')
  @ExigirPermissao('empreendimentos', 'consultar')
  async empreendimento(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return {
      data: await this.consultas.empreendimento(
        req.acesso,
        id,
        contextoEntidade,
      ),
    };
  }
  @Get('empreendimentos/:id/respostas')
  @ExigirPermissao('respostas', 'consultar')
  respostas(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @ConsultaDaColecao({ esquema: ESQUEMA_RESPOSTAS })
    consulta: ConsultaColecao,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return this.consultas.respostas(req.acesso, id, consulta, contextoEntidade);
  }
  @Get('empreendimentos/:id/inventarios')
  @ExigirPermissao('inventarios', 'consultar')
  inventarios(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @ConsultaDaColecao({ esquema: ESQUEMA_INVENTARIOS })
    consulta: ConsultaColecao,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return this.consultas.inventarios(
      req.acesso,
      id,
      consulta,
      contextoEntidade,
    );
  }
  @Get('empreendimentos/:id/contatos')
  @ExigirPermissao('empreendimentos', 'consultar')
  contatos(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @ConsultaDaColecao({ esquema: ESQUEMA_CONTATOS })
    consulta: ConsultaColecao,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return this.consultas.contatos(req.acesso, id, consulta, contextoEntidade);
  }
  @Get('empreendimentos/:id/cadastur')
  @ExigirPermissao('empreendimentos', 'consultar')
  cadastur(
    @Req() req: RequisicaoAutenticada,
    @Param('id', ParseIntPipe) id: number,
    @ConsultaDaColecao({ esquema: ESQUEMA_CADASTUR })
    consulta: ConsultaColecao,
    @ContextoEntidade() contextoEntidade: number | null,
  ) {
    return this.consultas.cadastur(req.acesso, id, consulta, contextoEntidade);
  }
  @Get('indicadores')
  @ExigirPermissao('indicadores', 'consultar')
  indicadores(
    @Req() req: RequisicaoAutenticada,
    @ConsultaDaColecao({ esquema: ESQUEMA_INDICADORES })
    consulta: ConsultaColecao,
  ) {
    return this.consultas.indicadores(req.acesso, consulta);
  }
  @Get('indicadores/exportacoes')
  @ExigirPermissao('indicadores', 'exportar')
  exportarIndicadores(
    @Req() req: RequisicaoAutenticada,
    @ConsultaDaColecao({ esquema: ESQUEMA_INDICADORES })
    consulta: ConsultaColecao,
  ) {
    return this.consultas.indicadores(req.acesso, consulta, true);
  }
}
