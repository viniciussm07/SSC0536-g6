import { COLECOES } from '@ssc0536/common';
import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { controllerColecao } from '../colecoes/colecao.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ColetasController } from './coletas.controller';
import { ColetasService } from './coletas.service';
import { ParametrosController } from './parametros.controller';
import { ParametrosService } from './parametros.service';
import { RhcController } from './rhc.controller';
import { RhcService } from './rhc.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(
      COLECOES.coletasDiarias,
      ColetasService,
      (s, e) => s.colecao(e.consulta),
      true,
    ),
    controllerColecao(
      COLECOES.rhcPeriodos,
      RhcService,
      (s, e) => s.colecao(e.consulta),
      true,
    ),
    controllerColecao(
      COLECOES.parametrosCalculo,
      ParametrosService,
      (s, e) => s.colecao(e.consulta),
      true,
    ),
    ColetasController,
    RhcController,
    ParametrosController,
  ],
  providers: [ColetasService, RhcService, ParametrosService],
})
export class DiariasModule {}
