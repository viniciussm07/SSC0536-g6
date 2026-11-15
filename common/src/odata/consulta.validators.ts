import { ODATA_LIMITES, PARAMETROS_ODATA } from './odata.constants.js';
import type {
  ConsultaOData,
  ErroConsulta,
  EsquemaOData,
  OrdenacaoOData,
  ResultadoOData,
} from './odata.types.js';
import { lerFiltro } from './filtro.validators.js';
import { buscarCampo, validarFiltro } from './tipos.validators.js';

/** Interpreta `$orderby`: `campo [asc|desc], ...`. */
export function lerOrdenacao(
  texto: string,
  esquema: EsquemaOData,
): ResultadoOData<OrdenacaoOData[]> {
  const erros: ErroConsulta[] = [];
  const itens = texto.split(',');
  if (itens.length > ODATA_LIMITES.camposOrdenacao)
    return {
      valido: false,
      erros: [
        {
          field: '$orderby',
          message: `Ordene por até ${ODATA_LIMITES.camposOrdenacao} campos.`,
        },
      ],
    };
  const resultado: OrdenacaoOData[] = [];
  let posicao = 0;
  for (const item of itens) {
    const partes = item.trim().split(/\s+/);
    const campo = partes[0] ?? '';
    const direcao = partes[1] ?? 'asc';
    const erro = (message: string) =>
      erros.push({
        field: '$orderby',
        message,
        position: posicao + (item.length - item.trimStart().length),
      });
    if (!campo || partes.length > 2) erro('Use "campo asc" ou "campo desc".');
    else if (direcao !== 'asc' && direcao !== 'desc')
      erro(`Direção inválida: ${direcao}. Use asc ou desc.`);
    else {
      const definicao = buscarCampo(esquema, campo);
      if (!definicao) erro(`Campo desconhecido: ${campo}.`);
      else if (!definicao.ordenavel) erro(`Campo não ordenável: ${campo}.`);
      else if (resultado.some((r) => r.campo === campo))
        erro(`Campo repetido: ${campo}.`);
      else resultado.push({ campo, direcao });
    }
    posicao += item.length + 1;
  }
  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: resultado };
}

const unico = (valor: unknown) =>
  typeof valor === 'string' ? valor : undefined;

/**
 * Interpreta os parâmetros OData da query string (`req.query`): valida sintaxe, campos,
 * tipos, limites e parâmetros `$` não suportados. Parâmetros sem `$` são ignorados aqui.
 */
export function lerConsultaOData(
  query: Readonly<Record<string, unknown>>,
  esquema: EsquemaOData,
): ResultadoOData<ConsultaOData> {
  const erros: ErroConsulta[] = [];
  for (const chave of Object.keys(query))
    if (
      chave.startsWith('$') &&
      !(PARAMETROS_ODATA as readonly string[]).includes(chave)
    )
      erros.push({ field: chave, message: 'Parâmetro OData não suportado.' });
  const bruto = (nome: (typeof PARAMETROS_ODATA)[number]) => {
    const valor = query[nome];
    if (valor === undefined) return undefined;
    if (unico(valor) === undefined) {
      erros.push({
        field: nome,
        message: 'Informe o parâmetro uma única vez.',
      });
      return undefined;
    }
    return valor as string;
  };

  let filtro: ConsultaOData['filtro'] = null;
  const textoFiltro = bruto('$filter');
  if (textoFiltro !== undefined && textoFiltro.trim() !== '') {
    const lido = lerFiltro(textoFiltro);
    if (!lido.valido) erros.push(...lido.erros);
    else {
      const tipos = validarFiltro(lido.data, esquema);
      if (tipos.length) erros.push(...tipos);
      else filtro = lido.data;
    }
  }

  let ordenacao: OrdenacaoOData[] = [...esquema.ordenacaoPadrao];
  const textoOrdem = bruto('$orderby');
  if (textoOrdem !== undefined && textoOrdem.trim() !== '') {
    const lida = lerOrdenacao(textoOrdem, esquema);
    if (!lida.valido) erros.push(...lida.erros);
    else ordenacao = lida.data;
  }

  const inteiro = (
    nome: '$top' | '$skip',
    maximo: number,
    padrao: number,
  ): number => {
    const valor = bruto(nome);
    if (valor === undefined || valor === '') return padrao;
    if (!/^\d{1,9}$/.test(valor) || Number(valor) > maximo) {
      erros.push({ field: nome, message: `Use um inteiro de 0 a ${maximo}.` });
      return padrao;
    }
    return Number(valor);
  };
  const top = inteiro('$top', ODATA_LIMITES.topMaximo, ODATA_LIMITES.topPadrao);
  const skip = inteiro('$skip', ODATA_LIMITES.skipMaximo, 0);

  let contar = false;
  const textoContar = bruto('$count');
  if (textoContar !== undefined && textoContar !== '') {
    if (textoContar === 'true' || textoContar === 'false')
      contar = textoContar === 'true';
    else erros.push({ field: '$count', message: 'Use true ou false.' });
  }
  return erros.length
    ? { valido: false, erros }
    : { valido: true, data: { filtro, ordenacao, top, skip, contar } };
}

/** `$orderby` do usuário seguido dos campos de desempate (sempre ascendentes). */
export function ordenacaoEstavel(
  ordenacao: readonly OrdenacaoOData[],
  esquema: EsquemaOData,
): OrdenacaoOData[] {
  const estavel = [...ordenacao];
  for (const campo of esquema.desempate)
    if (!estavel.some((o) => o.campo === campo))
      estavel.push({ campo, direcao: 'asc' });
  return estavel;
}
