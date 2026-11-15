import { COLECOES } from '@ssc0536/common';
import { controllerColecao } from '../colecoes/colecao.controller';
import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(COLECOES.auditorias, AuditoriaService, (s, e) =>
      s.listar(e.req.acesso, e.consulta),
    ),
    AuditoriaController,
  ],
  providers: [AuditoriaService],
})
export class AuditoriaModule {}
