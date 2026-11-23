import { ConflictException } from '@nestjs/common';

export const coletaDiariaDuplicada = () =>
  new ConflictException({
    error: {
      code: 'COLETA_DIARIA_DUPLICADA',
      message: 'Já existe uma coleta com esta identidade.',
      details: [
        {
          field: 'dataEstadia',
          message:
            'Mesmo empreendimento, período, fonte, data de estadia e tipo de dia.',
        },
      ],
    },
  });

export const coletaDiariaConflito = () =>
  new ConflictException({
    error: {
      code: 'COLETA_DIARIA_CONFLITO',
      message:
        'A mesma observação já existe com outro valor. Revise o conflito em vez de sobrescrever.',
      details: [{ field: 'valorDiaria', message: 'Valor divergente.' }],
    },
  });

export const rhcJaConferido = () =>
  new ConflictException({
    error: {
      code: 'RHC_JA_CONFERIDO',
      message: 'Já existe um RHC conferido para este período.',
      details: [
        {
          field: 'situacaoConferencia',
          message: 'Desmarque a conferência anterior antes de confirmar outra.',
        },
      ],
    },
  });

export const parametroDuplicado = () =>
  new ConflictException({
    error: {
      code: 'PARAMETRO_DUPLICADO',
      message: 'Já existe um parâmetro com esta chave e início de vigência.',
      details: [
        { field: 'chave', message: 'Chave e vigência já cadastradas.' },
      ],
    },
  });

export const parametroVigenciaSobreposta = () =>
  new ConflictException({
    error: {
      code: 'PARAMETRO_VIGENCIA_SOBREPOSTA',
      message: 'A vigência se sobrepõe a outro parâmetro com a mesma chave.',
      details: [
        {
          field: 'vigenciaInicio',
          message: 'Ajuste as datas para não haver sobreposição.',
        },
      ],
    },
  });
