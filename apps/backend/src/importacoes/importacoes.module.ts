import { Module } from '@nestjs/common';
import { COLECOES } from '@ssc0536/common';
import { AcessoModule } from '../acesso/acesso.module';
import { controllerColecao } from '../colecoes/colecao.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportacoesController } from './importacoes.controller';
import { ImportacoesService } from './importacoes.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(COLECOES.importacoes, ImportacoesService, (s, e) =>
      s.colecao(e.consulta),
    ),
    controllerColecao(COLECOES.linhasImportacao, ImportacoesService, (s, e) =>
      s.linhas(e.parametros.id, e.consulta),
    ),
    controllerColecao(
      COLECOES.ocorrenciasImportacao,
      ImportacoesService,
      (s, e) => s.ocorrencias(e.parametros.id, e.consulta),
    ),
    ImportacoesController,
  ],
  providers: [ImportacoesService],
})
export class ImportacoesModule {}
