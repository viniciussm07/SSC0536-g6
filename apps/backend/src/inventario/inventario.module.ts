import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

@Module({
  imports: [PrismaModule, AcessoModule],
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}
