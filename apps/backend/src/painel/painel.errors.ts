import { BadRequestException, NotFoundException } from '@nestjs/common';

export const periodoPainelNaoEncontrado = (campo: string) =>
  new NotFoundException({
    error: {
      code: 'PERIODO_NAO_ENCONTRADO',
      message: 'Período não encontrado.',
      details: [{ field: campo, message: 'Período inexistente.' }],
    },
  });

/** Comparar mês com feriado prolongado (ou durações distintas) não é comparação válida. */
export const periodosIncompativeis = () =>
  new BadRequestException({
    error: {
      code: 'PERIODOS_INCOMPATIVEIS',
      message: 'Só períodos do mesmo tipo podem ser comparados.',
      details: [
        {
          field: 'comparacaoPeriodoId',
          message: 'Escolha um período do mesmo tipo do período principal.',
        },
      ],
    },
  });
