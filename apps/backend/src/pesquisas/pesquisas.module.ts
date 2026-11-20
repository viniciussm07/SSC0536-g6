import { COLECOES } from '@ssc0536/common';
import { controllerColecao } from '../colecoes/colecao.controller';
import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModelosPesquisaController } from './modelos.controller';
import { ModelosPesquisaService } from './modelos.service';
import { EdicoesPesquisaController } from './edicoes.controller';
import { EdicoesPesquisaService } from './edicoes.service';
import { RespostasPesquisaController } from './respostas.controller';
import { RespostasPesquisaService } from './respostas.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(
      COLECOES.modelosPesquisa,
      ModelosPesquisaService,
      (s, e) => s.colecao(e.consulta),
    ),
    controllerColecao(COLECOES.versoesModelo, ModelosPesquisaService, (s, e) =>
      s.versoes(e.parametros.id, e.consulta),
    ),
    ModelosPesquisaController,
    controllerColecao(
      COLECOES.pesquisas,
      EdicoesPesquisaService,
      (s, e) => s.colecao(e.consulta),
      true,
    ),
    controllerColecao(
      COLECOES.destinatariosPesquisa,
      EdicoesPesquisaService,
      (s, e) => s.destinatarios(e.parametros.id, e.consulta),
      true,
    ),
    EdicoesPesquisaController,
    controllerColecao(
      COLECOES.pesquisasRespondente,
      RespostasPesquisaService,
      (s, e) => s.painel(e.req.acesso, e.parametros.id, e.consulta, e.contexto),
    ),
    RespostasPesquisaController,
  ],
  providers: [
    ModelosPesquisaService,
    EdicoesPesquisaService,
    RespostasPesquisaService,
  ],
  exports: [ModelosPesquisaService, EdicoesPesquisaService],
})
export class PesquisasModule {}
