import { COLECOES } from '@ssc0536/common';
import { controllerColecao } from '../colecoes/colecao.controller';
import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [
    controllerColecao(COLECOES.catalogoGrupos, CatalogoService, (s, e) =>
      s.grupoColecao(e.consulta),
    ),
    controllerColecao(COLECOES.catalogoItens, CatalogoService, (s, e) =>
      s.itemColecao(e.consulta),
    ),
    controllerColecao(COLECOES.catalogoVersoes, CatalogoService, (s, e) =>
      s.versoes(e.parametros.id, e.consulta),
    ),
    CatalogoController,
  ],
  providers: [CatalogoService],
})
export class CatalogoModule {}
