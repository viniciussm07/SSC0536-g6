import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

export const novoToken = () => randomBytes(32).toString('hex');
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const custo = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let operacoes = 0;
async function derivar(senha: string, salt: string): Promise<Buffer> {
  if (operacoes >= 2)
    throw new ServiceUnavailableException({
      error: {
        code: 'AUTENTICACAO_OCUPADA',
        message: 'Tente novamente em instantes.',
      },
    });
  operacoes++;
  try {
    return await new Promise((resolve, reject) =>
      scrypt(senha, salt, 64, custo, (erro, chave) =>
        erro ? reject(erro) : resolve(chave),
      ),
    );
  } finally {
    operacoes--;
  }
}
export async function hashSenha(senha: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derivar(senha, salt)).toString('hex')}`;
}
export async function conferirSenha(senha: string, hash?: string) {
  const valido =
    typeof hash === 'string' &&
    /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash);
  const [, salt, esperado] = valido
    ? hash.split('$')
    : ['scrypt', '0'.repeat(32), '0'.repeat(128)];
  const atual = await derivar(senha, salt);
  return timingSafeEqual(atual, Buffer.from(esperado, 'hex')) && valido;
}
