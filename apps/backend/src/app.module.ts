import { AuditoriaModule } from './auditoria/auditoria.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { CadastroModule } from './cadastro/cadastro.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { InventarioModule } from './inventario/inventario.module';
import { ImportacoesModule } from './importacoes/importacoes.module';
import { PeriodosModule } from './periodos/periodos.module';
import { PesquisasModule } from './pesquisas/pesquisas.module';
import { AcessoModule } from './acesso/acesso.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    HealthModule,
    AutenticacaoModule,
    AcessoModule,
    CadastroModule,
    CatalogoModule,
    InventarioModule,
    PeriodosModule,
    ImportacoesModule,
    PesquisasModule,
    AuditoriaModule,
  ],
})
export class AppModule {}
