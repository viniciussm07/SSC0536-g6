import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  ForbiddenException,
} from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function cookieSessao(req: IncomingMessage): string | undefined {
  const valores = (req.headers.cookie ?? '')
    .split(';')
    .map((v) => v.trim())
    .filter((v) => v.startsWith('oto_sessao='));
  return valores.length === 1
    ? valores[0].slice('oto_sessao='.length)
    : undefined;
}
export function conferirOrigem(req: IncomingMessage, origem: string) {
  if (
    req.headers.origin !== origem ||
    req.headers['x-oto-request'] !== '1' ||
    // O upload binário de planilha (parte 08) usa octet-stream; ambos exigem preflight CORS,
    // assim como o cabeçalho X-OTO-Request, e nenhum é aceito em formulário entre origens.
    !/^application\/(json|octet-stream)\b/.test(
      req.headers['content-type'] ?? '',
    )
  ) {
    throw new ForbiddenException({
      error: {
        code: 'ORIGEM_INVALIDA',
        message: 'Origem da requisição não permitida.',
      },
    });
  }
}
@Catch()
export class AutenticacaoExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<ServerResponse>();
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const body =
      error instanceof HttpException ? error.getResponse() : undefined;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (status === 429) res.setHeader('Retry-After', '900');
    if (status === 401)
      res.setHeader(
        'Set-Cookie',
        'oto_sessao=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      );
    res.end(
      JSON.stringify(
        typeof body === 'object' && body !== null && 'error' in body
          ? body
          : {
              error: {
                code:
                  status === 400
                    ? 'ENTRADA_INVALIDA'
                    : 'AUTENTICACAO_INDISPONIVEL',
                message:
                  status === 400
                    ? 'Confira os campos informados.'
                    : 'Não foi possível completar a operação.',
              },
            },
      ),
    );
  }
}
