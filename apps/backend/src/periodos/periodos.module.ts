import { COLECOES } from '@ssc0536/common';
import { controllerColecao } from '../colecoes/colecao.controller';
import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PeriodosController } from './periodos.controller';
import { PeriodosService } from './periodos.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(COLECOES.periodos, PeriodosService, (s, e) =>
      s.colecao(e.consulta),
    ),
    PeriodosController,
  ],
  providers: [PeriodosService],
  exports: [PeriodosService],
})
export class PeriodosModule {}
