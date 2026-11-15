import type { PlanoVigencia, VigenciaExistente } from './versao.types.js';

const MS_DIA = 86_400_000;
const paraData = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const deData = (data: Date) => data.toISOString().slice(0, 10);
/** Aritmética em datas civis (UTC, sem fuso): nunca depende do horário local. */
export const diaAnterior = (iso: string) =>
  deData(new Date(paraData(iso).getTime() - MS_DIA));
export const diaSeguinte = (iso: string) =>
  deData(new Date(paraData(iso).getTime() + MS_DIA));

/** Versão vigente na data (fim inclusivo; fim nulo = aberta). Ignora versões substituídas. */
export function localizarVigente<T extends VigenciaExistente>(
  versoes: readonly T[],
  data: string,
): T | undefined {
  return versoes.find(
    (v) => v.inicio <= data && (v.fim === null || v.fim >= data),
  );
}

/**
 * Efeito de uma mudança real iniciada em `inicio` sobre a linha do tempo (versões não
 * substituídas, datas civis, fim inclusivo, sem sobreposição):
 * - se uma versão cobre a data, ela é fechada no dia anterior e a nova herda o fim dela;
 * - se nenhuma cobre, a nova vai até o dia anterior à próxima versão (ou fica aberta);
 * - começar no mesmo dia de uma versão existente é correção, não mudança real.
 */
export function planejarMudancaReal(
  existentes: readonly VigenciaExistente[],
  inicio: string,
  fim: string | null,
): PlanoVigencia {
  const erro = (field: string, message: string): PlanoVigencia => ({
    valido: false,
    erros: [{ field, message }],
  });
  if (fim !== null && fim < inicio)
    return erro(
      'vigenciaFim',
      'O fim da vigência não pode ser anterior ao início.',
    );
  const ordenadas = [...existentes].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  );
  const cobrindo = localizarVigente(ordenadas, inicio);
  if (cobrindo) {
    if (cobrindo.inicio === inicio)
      return erro(
        'vigenciaInicio',
        'Já existe uma versão que começa nesta data; para ajustar os valores, registre uma correção.',
      );
    // O fim da nova versão é o da que ela divide: aceitar outro fim abriria uma lacuna silenciosa.
    if (fim !== null && fim !== cobrindo.fim)
      return erro(
        'vigenciaFim',
        'Esta mudança divide uma versão em andamento; deixe o fim em branco para manter o fim dela.',
      );
    return {
      valido: true,
      fechar: [{ id: cobrindo.id, fim: diaAnterior(inicio) }],
      fim: cobrindo.fim,
    };
  }
  const proxima = ordenadas.find((v) => v.inicio > inicio);
  const limite = proxima ? diaAnterior(proxima.inicio) : null;
  if (fim !== null && limite !== null && fim > limite)
    return erro(
      'vigenciaFim',
      'A vigência invade a próxima versão; encerre-a até o dia anterior.',
    );
  return { valido: true, fechar: [], fim: fim ?? limite };
}

/** Uma correção mantém a vigência da versão corrigida e a substitui na linha do tempo. */
export function planejarCorrecao(
  existentes: readonly VigenciaExistente[],
  corrigeId: number,
):
  | { valido: true; alvo: VigenciaExistente }
  | { valido: false; erros: { field: string; message: string }[] } {
  const alvo = existentes.find((v) => v.id === corrigeId);
  return alvo
    ? { valido: true, alvo }
    : {
        valido: false,
        erros: [
          {
            field: 'corrigeId',
            message: 'Versão a corrigir inexistente ou já substituída.',
          },
        ],
      };
}

/** Mudança real que começa antes de hoje (retroativa) só é feita pela equipe. */
export function ehRetroativa(inicio: string, hoje: string) {
  return inicio < hoje;
}
