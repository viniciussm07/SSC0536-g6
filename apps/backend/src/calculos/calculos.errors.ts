import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export const execucaoNaoEncontrada = () =>
  new NotFoundException({
    error: {
      code: 'CALCULO_NAO_ENCONTRADO',
      message: 'Execução de cálculo não encontrada.',
    },
  });

export const perguntaNaoEncontrada = () =>
  new NotFoundException({
    error: {
      code: 'PERGUNTA_NAO_ENCONTRADA',
      message: 'Pergunta não encontrada.',
      details: [{ field: 'perguntaId', message: 'Pergunta inexistente.' }],
    },
  });

/** A taxa de ocupação vem de um campo percentual; texto e escolha não alimentam a fórmula. */
export const perguntaNaoCalculavel = () =>
  new BadRequestException({
    error: {
      code: 'PERGUNTA_NAO_CALCULAVEL',
      message:
        'A pergunta escolhida não é um campo percentual de taxa de ocupação.',
      details: [
        { field: 'perguntaId', message: 'Escolha uma pergunta percentual.' },
      ],
    },
  });

export const calculoEmAndamento = () =>
  new ConflictException({
    error: {
      code: 'CALCULO_EM_ANDAMENTO',
      message:
        'Já existe uma execução pendente ou em andamento para esta pergunta. Aguarde a conclusão.',
    },
  });

export const calculoNaoRetomavel = () =>
  new ConflictException({
    error: {
      code: 'CALCULO_NAO_RETOMAVEL',
      message:
        'Só uma execução que falhou ou foi interrompida pode ser retomada.',
    },
  });

export const calculoNaoConcluido = () =>
  new ConflictException({
    error: {
      code: 'CALCULO_NAO_CONCLUIDO',
      message: 'Só uma execução concluída pode ser publicada.',
    },
  });

export const calculoJaPublicado = () =>
  new ConflictException({
    error: {
      code: 'CALCULO_JA_PUBLICADO',
      message:
        'Esta execução já foi publicada ou substituída; recalcule para gerar nova revisão.',
    },
  });

export const motivoSubstituicaoObrigatorio = () =>
  new BadRequestException({
    error: {
      code: 'ENTRADA_INVALIDA',
      message: 'Confira os campos informados.',
      details: [
        {
          field: 'motivo',
          message: 'Informe o motivo para substituir a publicação vigente.',
        },
      ],
    },
  });

/** Falha de domínio no processamento: a mensagem é gravada na execução e não contém dados pessoais. */
export class FalhaCalculo extends Error {}
