import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [PainelController],
  providers: [PainelService],
})
export class PainelModule {}
