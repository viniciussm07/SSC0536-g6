import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { CandidatoDuplicidade, ErroCampo } from '@ssc0536/common';

export const entradaInvalidaCampos = (erros: ErroCampo[]) =>
  new BadRequestException({
    error: {
      code: 'ENTRADA_INVALIDA',
      message: 'Confira os campos informados.',
      details: erros,
    },
  });
export const duplicidadePotencial = (candidatos: CandidatoDuplicidade[]) =>
  new ConflictException({
    error: {
      code: 'DUPLICIDADE_POTENCIAL',
      message:
        'Há empreendimentos que podem ser o mesmo. Confira e confirme que este é outro cadastro.',
      details: candidatos,
    },
  });
export const campoRestrito = (campos: string[]) =>
  new ForbiddenException({
    error: {
      code: 'CAMPO_RESTRITO',
      message: 'Estes campos só podem ser alterados pela equipe do OTO.',
      details: campos.map((field) => ({
        field,
        message: 'Alteração restrita à equipe do OTO.',
      })),
    },
  });
