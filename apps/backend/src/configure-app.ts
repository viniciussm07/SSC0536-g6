import { API_PREFIX } from '@ssc0536/common';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, type RequestHandler } from 'express';

export function configureApp(app: INestApplication) {
  // O contrato permite 2.400 valores de até 2.000 unidades UTF-16. O pior
  // caso em JSON escapado cabe em 32 MiB; demais rotas mantêm o padrão Nest.
  const parserResposta = json({ limit: '32mb' });
  const receberResposta: RequestHandler = (req, res, next) => {
    if (req.method !== 'PUT') return next();
    return parserResposta(req, res, next);
  };
  app.use(
    /^\/api\/empreendimentos\/\d+\/pesquisas\/\d+\/resposta\/?$/,
    receberResposta,
  );
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: app.get(ConfigService).getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
