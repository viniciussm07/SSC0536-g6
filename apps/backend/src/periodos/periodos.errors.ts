import { ConflictException } from '@nestjs/common';

export const periodoDuplicado = () =>
  new ConflictException({
    error: {
      code: 'PERIODO_DUPLICADO',
      message: 'Já existe um período com este tipo e intervalo.',
      details: [
        { field: 'dataInicio', message: 'Tipo e datas já cadastrados.' },
      ],
    },
  });

/** Período referenciado por pesquisas, coletas ou indicadores não muda datas nem tipo. */
export const periodoEmUso = () =>
  new ConflictException({
    error: {
      code: 'PERIODO_EM_USO',
      message:
        'O período já referencia pesquisas, coletas ou indicadores; datas e tipo não podem mudar.',
      details: [
        {
          field: 'dataInicio',
          message: 'Altere apenas o rótulo ou crie um novo período.',
        },
      ],
    },
  });
