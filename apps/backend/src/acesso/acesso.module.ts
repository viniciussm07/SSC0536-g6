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
  controllers: [AcessoController],
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
