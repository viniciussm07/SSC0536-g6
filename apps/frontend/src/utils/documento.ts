const CNPJ_DIGITOS = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/;

/** CNPJ de 14 dígitos como 00.000.000/0000-00; outro texto aparece como foi cadastrado. */
export function formatarCnpj(cnpj: string) {
  const digitos = cnpj.replace(/\D/g, '');
  return CNPJ_DIGITOS.test(digitos)
    ? digitos.replace(CNPJ_DIGITOS, '$1.$2.$3/$4-$5')
    : cnpj;
}

/**
 * Identificação exibida de um empreendimento: o CNPJ cadastrado ou, na ausência dele, o ID do
 * sistema (que é quem de fato identifica; o CNPJ é opcional e sem unicidade). Nunca inventa número.
 */
export function rotuloIdentificacao(
  cnpj: string | null | undefined,
  id: number,
) {
  return cnpj?.trim() ? `CNPJ ${formatarCnpj(cnpj.trim())}` : `ID ${id}`;
}
