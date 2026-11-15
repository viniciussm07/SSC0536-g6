import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  Logger.log(`API disponível em http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error(error, undefined, 'Bootstrap');
  process.exit(1);
});
