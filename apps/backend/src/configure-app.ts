import { API_PREFIX, LIMITES_IMPORTACAO } from '@ssc0536/common';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, raw, type RequestHandler } from 'express';

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
  // Upload binário de planilha: o limite é conferido aqui, antes de qualquer leitura do conteúdo.
  const parserArquivo = raw({
    type: () => true,
    limit: LIMITES_IMPORTACAO.tamanhoMaximoBytes,
  });
  const receberArquivo: RequestHandler = (req, res, next) => {
    if (req.method !== 'POST') return next();
    return parserArquivo(req, res, (erro?: unknown) => {
      if (!erro) return next();
      const grande = (erro as { type?: string }).type === 'entity.too.large';
      res.status(grande ? 413 : 400).json({
        error: {
          code: grande ? 'ARQUIVO_MUITO_GRANDE' : 'ENTRADA_INVALIDA',
          message: grande
            ? `O arquivo excede ${LIMITES_IMPORTACAO.tamanhoMaximoBytes / 1024 / 1024} MB.`
            : 'Corpo da requisição inválido.',
        },
      });
    });
  };
  app.use(/^\/api\/importacoes\/?$/, receberArquivo);
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
