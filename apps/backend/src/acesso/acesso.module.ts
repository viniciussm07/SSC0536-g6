import { COLECOES } from '@ssc0536/common';
import { controllerColecao } from '../colecoes/colecao.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AutorizacaoService } from './autorizacao.service';
import { AcessoGuard } from './acesso.guard';
import { AcessoController } from './acesso.controller';
import { ContasService } from './contas.service';
import { PoliticasService } from './politicas.service';
import { ConsultasAcessoService } from './consultas.service';
@Module({
  imports: [PrismaModule],
  controllers: [
    controllerColecao(
      COLECOES.empreendimentos,
      ConsultasAcessoService,
      (s, e) =>
        s.empreendimentos(e.req.acesso, e.consulta, e.exportar, e.contexto),
    ),
    controllerColecao(COLECOES.indicadores, ConsultasAcessoService, (s, e) =>
      s.indicadores(e.req.acesso, e.consulta, e.exportar),
    ),
    controllerColecao(COLECOES.contatos, ConsultasAcessoService, (s, e) =>
      s.contatos(e.req.acesso, e.parametros.id, e.consulta, e.contexto),
    ),
    controllerColecao(COLECOES.cadastur, ConsultasAcessoService, (s, e) =>
      s.cadastur(e.req.acesso, e.parametros.id, e.consulta, e.contexto),
    ),
    controllerColecao(COLECOES.inventarios, ConsultasAcessoService, (s, e) =>
      s.inventarios(e.req.acesso, e.parametros.id, e.consulta, e.contexto),
    ),
    controllerColecao(COLECOES.respostas, ConsultasAcessoService, (s, e) =>
      s.respostas(e.req.acesso, e.parametros.id, e.consulta, e.contexto),
    ),
    AcessoController,
  ],
  providers: [
    AutorizacaoService,
    ContasService,
    PoliticasService,
    ConsultasAcessoService,
    { provide: APP_GUARD, useClass: AcessoGuard },
  ],
  exports: [AutorizacaoService],
})
export class AcessoModule {}
