import { Module } from '@nestjs/common';
import { COLECOES } from '@ssc0536/common';
import { AcessoModule } from '../acesso/acesso.module';
import { controllerColecao } from '../colecoes/colecao.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CalculosController } from './calculos.controller';
import { CalculosService } from './calculos.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(
      COLECOES.calculos,
      CalculosService,
      (s, e) => s.colecao(e.consulta),
      true,
    ),
    CalculosController,
  ],
  providers: [CalculosService],
})
export class CalculosModule {}
