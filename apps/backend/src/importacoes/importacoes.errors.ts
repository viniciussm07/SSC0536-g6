import {
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { LIMITES_IMPORTACAO } from '@ssc0536/common';

export const arquivoJaRecebido = (loteId: number) =>
  new ConflictException({
    error: {
      code: 'ARQUIVO_JA_RECEBIDO',
      message:
        'Este arquivo já foi recebido para esta fonte. Use o lote existente ou reprocesse a leitura.',
      details: [{ field: 'loteId', message: String(loteId) }],
    },
  });
export const arquivoMuitoGrande = () =>
  new PayloadTooLargeException({
    error: {
      code: 'ARQUIVO_MUITO_GRANDE',
      message: `O arquivo excede ${LIMITES_IMPORTACAO.tamanhoMaximoBytes / 1024 / 1024} MB.`,
    },
  });
export const arquivoVazio = () =>
  new BadRequestException({
    error: {
      code: 'ENTRADA_INVALIDA',
      message: 'Envie o conteúdo do arquivo no corpo da requisição.',
      details: [{ field: 'arquivo', message: 'Arquivo vazio ou ausente.' }],
    },
  });
export const leituraEmAndamento = () =>
  new ConflictException({
    error: {
      code: 'LEITURA_EM_ANDAMENTO',
      message: 'Este lote já está sendo lido. Aguarde e consulte o estado.',
    },
  });
