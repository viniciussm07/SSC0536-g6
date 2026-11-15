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

  return {
    ...config,
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_URL: new URL(frontendUrl).origin,
  };
}
