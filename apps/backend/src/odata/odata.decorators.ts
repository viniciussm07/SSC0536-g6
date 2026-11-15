import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import {
  PARAMETROS_ODATA,
  lerConsultaOData,
  type ConsultaOData,
  type EsquemaOData,
  type ErroConsulta,
} from '@ssc0536/common';
import { filtroInvalido } from './odata.errors';

export type ConsultaColecao = ConsultaOData;
export interface OpcoesColecao {
  esquema: EsquemaOData;
}

/** Lê e valida a consulta OData; qualquer outro parâmetro de consulta é rejeitado (400). */
export function lerConsultaColecao(
  query: Readonly<Record<string, unknown>>,
  { esquema }: OpcoesColecao,
): ConsultaColecao {
  const desconhecidos: ErroConsulta[] = Object.keys(query)
    .filter(
      (chave) =>
        !(PARAMETROS_ODATA as readonly string[]).includes(chave) &&
        !chave.startsWith('$'),
    )
    .map((chave) => ({ field: chave, message: 'Parâmetro não suportado.' }));
  const odata = lerConsultaOData(query, esquema);
  const erros = [...desconhecidos, ...(odata.valido ? [] : odata.erros)];
  if (erros.length || !odata.valido) throw filtroInvalido(erros);
  return odata.data;
}

/** Consulta OData da coleção (`$filter`, `$orderby`, `$top`, `$skip`, `$count`) da requisição. */
export const ConsultaDaColecao = createParamDecorator(
  (opcoes: OpcoesColecao, execucao: ExecutionContext): ConsultaColecao => {
    const req = execucao
      .switchToHttp()
      .getRequest<{ query: Record<string, unknown> }>();
    return lerConsultaColecao(req.query ?? {}, opcoes);
  },
);
