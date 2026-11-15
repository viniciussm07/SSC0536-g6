import { ConflictException } from '@nestjs/common';

export const chaveDuplicada = (campo: string) =>
  new ConflictException({
    error: {
      code: 'CHAVE_DUPLICADA',
      message: 'Já existe um registro com esta chave.',
      details: [{ field: campo, message: 'Chave já utilizada.' }],
    },
  });
