import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
})
export class AuditoriaModule {}
