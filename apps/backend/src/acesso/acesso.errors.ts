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
