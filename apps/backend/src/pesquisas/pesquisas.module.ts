import { COLECOES } from '@ssc0536/common';
import { controllerColecao } from '../colecoes/colecao.controller';
import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModelosPesquisaController } from './modelos.controller';
import { ModelosPesquisaService } from './modelos.service';

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
  ],
  providers: [ModelosPesquisaService],
  exports: [ModelosPesquisaService],
})
export class PesquisasModule {}
