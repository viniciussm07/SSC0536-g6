import { BadRequestException } from '@nestjs/common';
import type { ErroConsulta } from '@ssc0536/common';

export const filtroInvalido = (erros: ErroConsulta[]) =>
  new BadRequestException({
    error: {
      code: 'FILTRO_INVALIDO',
      message: 'Confira os parâmetros de consulta.',
      details: erros,
    },
  });
