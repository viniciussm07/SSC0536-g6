import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

export const acessoNegado = () =>
  new ForbiddenException({
    error: {
      code: 'ACESSO_NEGADO',
      message: 'Você não tem permissão para esta operação.',
    },
  });
export const naoEncontrado = () =>
  new NotFoundException({
    error: {
      code: 'RECURSO_NAO_ENCONTRADO',
      message: 'Recurso não encontrado no escopo autorizado.',
    },
  });
export const conflitoAcesso = (message: string) =>
  new ConflictException({ error: { code: 'CONFLITO_ACESSO', message } });
export const entradaInvalida = (message: string) =>
  new BadRequestException({ error: { code: 'ENTRADA_INVALIDA', message } });
export const sessaoInvalida = () =>
  new UnauthorizedException({
    error: {
      code: 'SESSAO_INVALIDA',
      message: 'Acesso inválido ou sessão expirada.',
    },
  });
export const contextoInvalido = () =>
  new BadRequestException({
    error: {
      code: 'CONTEXTO_INVALIDO',
      message:
        'O cabeçalho de contexto deve ser um ID de empreendimento válido.',
    },
  });
export const contextoObrigatorio = () =>
  new BadRequestException({
    error: {
      code: 'CONTEXTO_OBRIGATORIO',
      message: 'Selecione um empreendimento para acessar estes dados.',
    },
  });
export const contextoDivergente = () =>
  new ConflictException({
    error: {
      code: 'CONTEXTO_DIVERGENTE',
      message: 'O empreendimento solicitado difere do contexto selecionado.',
    },
  });
