import { ConflictException, ForbiddenException } from '@nestjs/common';

export const vigenciaConflitante = () =>
  new ConflictException({
    error: {
      code: 'VIGENCIA_CONFLITANTE',
      message:
        'Outra atualização alterou a linha do tempo do inventário. Recarregue e tente de novo.',
    },
  });
export const versaoSubstituida = () =>
  new ConflictException({
    error: {
      code: 'VERSAO_SUBSTITUIDA',
      message: 'Esta versão foi substituída por uma correção.',
    },
  });
export const alteracaoRetroativaRestrita = () =>
  new ForbiddenException({
    error: {
      code: 'ALTERACAO_RETROATIVA_RESTRITA',
      message:
        'Mudanças com início anterior a hoje só podem ser registradas pela equipe do OTO.',
      details: [
        {
          field: 'vigenciaInicio',
          message: 'Use uma data a partir de hoje ou peça à equipe do OTO.',
        },
      ],
    },
  });
export const conferenciaRestrita = () =>
  new ForbiddenException({
    error: {
      code: 'CONFERENCIA_RESTRITA',
      message: 'A conferência do inventário é feita pela equipe do OTO.',
    },
  });
