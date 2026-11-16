import { ConflictException } from '@nestjs/common';

/** Chave de campo/opção já usada dentro do modelo. */
export const chaveRepetida = (campo: string) =>
  new ConflictException({
    error: {
      code: 'CHAVE_DUPLICADA',
      message: 'Já existe um campo ou opção com esta chave no modelo.',
      details: [{ field: campo, message: 'Chave já utilizada.' }],
    },
  });
