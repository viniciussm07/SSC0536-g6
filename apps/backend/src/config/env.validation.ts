export function validateEnvironment(config: Record<string, unknown>) {
  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
  }

  const databaseUrl = String(config.DATABASE_URL ?? '');
  if (
    !URL.canParse(databaseUrl) ||
    !['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)
  ) {
    throw new Error('DATABASE_URL deve ser uma URL válida do PostgreSQL.');
  }

  const frontendUrl = String(config.FRONTEND_URL ?? 'http://localhost:5173');
  if (
    !URL.canParse(frontendUrl) ||
    !['http:', 'https:'].includes(new URL(frontendUrl).protocol)
  ) {
    throw new Error('FRONTEND_URL deve ser uma URL HTTP ou HTTPS válida.');
  }

  const secureInput =
    config.AUTH_COOKIE_SECURE ??
    (config.NODE_ENV === 'production' ? 'true' : 'false');
  if (!['true', 'false', true, false].includes(secureInput as string | boolean))
    throw new Error('AUTH_COOKIE_SECURE deve ser true ou false.');
  const secure = secureInput === true || secureInput === 'true';
  if (
    config.NODE_ENV === 'production' &&
    !secure &&
    !['localhost', '127.0.0.1'].includes(new URL(frontendUrl).hostname)
  )
    throw new Error(
      'Cookie seguro é obrigatório em produção fora do ambiente local.',
    );
  return {
    ...config,
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_URL: new URL(frontendUrl).origin,
    AUTH_COOKIE_SECURE: secure,
  };
}
