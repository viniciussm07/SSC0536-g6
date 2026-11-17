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

/** Campo removido do modelo já é usado por perguntas de alguma edição. */
export const campoEmUso = (chaves: string[]) =>
  new ConflictException({
    error: {
      code: 'CAMPO_EM_USO',
      message:
        'Campos usados por edições de pesquisa não podem ser removidos do modelo.',
      details: chaves.map((chave) => ({
        field: 'campos',
        message: `O campo "${chave}" já é usado por uma edição.`,
      })),
    },
  });

const conflito = (code: string, message: string, field?: string) =>
  new ConflictException({
    error: {
      code,
      message,
      ...(field ? { details: [{ field, message }] } : {}),
    },
  });

/** Ação não permitida no estado atual da edição (ex.: abrir uma edição aberta). */
export const estadoPesquisaInvalido = (situacao: string, acao: string) =>
  conflito(
    'PESQUISA_ESTADO_INVALIDO',
    `Não é possível ${acao} uma edição na situação "${situacao}".`,
  );

/** Campo que só muda em rascunho (ou enquanto agendada). */
export const campoBloqueadoPesquisa = (campos: string[]) =>
  new ConflictException({
    error: {
      code: 'PESQUISA_CAMPO_BLOQUEADO',
      message: 'Após a abertura, só título e prazo podem mudar.',
      details: campos.map((field) => ({
        field,
        message: 'Bloqueado após a abertura.',
      })),
    },
  });

/** Prorrogar edição expirada equivale a reabrir, cuja regra depende do OTO. */
export const reaberturaPendente = () =>
  conflito(
    'PESQUISA_REABERTURA_PENDENTE',
    'A edição já expirou; a reabertura depende de regra a definir com o OTO.',
    'prazo',
  );

export const prazoNoPassado = () =>
  conflito(
    'PESQUISA_PRAZO_PASSADO',
    'O prazo precisa ser posterior ao momento atual.',
    'prazo',
  );

export const semDestinatarios = () =>
  conflito(
    'PESQUISA_SEM_DESTINATARIOS',
    'Nenhum empreendimento ativo atende ao público selecionado.',
    'segmentoIds',
  );

/** Envio fora da janela de recebimento (antes da abertura, expirada ou encerrada). */
export const pesquisaNaoRecebe = (situacao: string) =>
  conflito(
    'PESQUISA_FORA_DO_PRAZO',
    `A edição não recebe respostas na situação "${situacao}".`,
  );

export const empreendimentoNaoDestinatario = () =>
  conflito(
    'PESQUISA_NAO_DESTINATARIO',
    'O empreendimento não faz parte do público desta edição.',
  );
