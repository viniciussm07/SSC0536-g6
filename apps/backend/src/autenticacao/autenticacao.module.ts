import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AutenticacaoService } from './autenticacao.service';
import { AutenticacaoController } from './autenticacao.controller';
@Module({
  imports: [PrismaModule],
  controllers: [AutenticacaoController],
  providers: [AutenticacaoService],
  exports: [AutenticacaoService],
})
export class AutenticacaoModule {}
