import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { CadastroModule } from './cadastro/cadastro.module';
import { AcessoModule } from './acesso/acesso.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    HealthModule,
    AutenticacaoModule,
    AcessoModule,
    CadastroModule,
  ],
})
export class AppModule {}
