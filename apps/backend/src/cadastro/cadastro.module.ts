import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CadastroController } from './cadastro.controller';
import { CadastroService } from './cadastro.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [CadastroController],
  providers: [CadastroService],
})
export class CadastroModule {}
