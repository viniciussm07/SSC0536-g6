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

const conflito = (code: string, message: string) =>
  new ConflictException({ error: { code, message } });
export const loteNaoLido = () =>
  conflito(
    'LOTE_NAO_LIDO',
    'Só lotes com leitura concluída podem ser conciliados.',
  );
export const destinoTravado = () =>
  conflito(
    'DESTINO_TRAVADO',
    'O destino não muda depois que linhas foram aplicadas.',
  );
export const destinoIncompativel = (motivo: string) =>
  conflito('DESTINO_INCOMPATIVEL', motivo);
export const linhaAplicada = () =>
  conflito(
    'LINHA_APLICADA',
    'A linha já foi aplicada e não aceita nova decisão.',
  );
export const semVinculo = () =>
  conflito(
    'SEM_VINCULO',
    'Vincule a linha a um empreendimento antes de resolver o conflito.',
  );
export const semConflito = () =>
  conflito(
    'SEM_CONFLITO',
    'Esta linha não tem conflito com resposta existente.',
  );
export const planoDesatualizado = () =>
  conflito(
    'PLANO_DESATUALIZADO',
    'O plano mudou desde a conferência. Revise os totais e confirme novamente.',
  );
export const nadaAConfirmar = () =>
  conflito(
    'NADA_A_CONFIRMAR',
    'Não há linhas prontas para aplicar. Resolva as pendências antes.',
  );
export const loteSemDestino = () =>
  conflito(
    'SEM_DESTINO',
    'Escolha a edição e a pergunta de destino antes de confirmar.',
  );
