import {
  FINALIDADES_CONTATO,
  LIMITES_CADASTRO,
  SITUACOES_CADASTUR,
  SITUACOES_EMPREENDIMENTO,
  TIPOS_CONTATO,
  ZONAS,
} from './cadastro.constants.js';
import type {
  AlteracaoEmpreendimento,
  CadasturEntrada,
  ContatoEntrada,
  Coordenadas,
  EntradaEmpreendimento,
  ErroCampo,
  ResultadoEntrada,
} from './cadastro.types.js';

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const inteiroPositivo = (v: unknown): v is number =>
  typeof v === 'number' &&
  Number.isSafeInteger(v) &&
  v > 0 &&
  v <= 2_147_483_647;

/** Data civil YYYY-MM-DD existente no calendário (sem fuso). */
export function dataCivilValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor))
    return false;
  const [a, m, d] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return (
    a >= 1900 &&
    data.getUTCFullYear() === a &&
    data.getUTCMonth() === m - 1 &&
    data.getUTCDate() === d
  );
}

/** Remove a máscara; exige 14 dígitos. Não valida dígitos verificadores (regra não aprovada). */
export function normalizarCnpj(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '');
  return /^\d{14}$/.test(digitos) && /^[\d./\-\s]+$/.test(valor)
    ? digitos
    : null;
}

class Coletor {
  readonly erros: ErroCampo[] = [];
  erro(field: string, message: string) {
    this.erros.push({ field, message });
  }
  /** Texto opcional: omitido (undefined) ignora, null limpa, texto vazio é erro. */
  textoOpcional(
    origem: Objeto,
    chave: string,
    maximo: number,
    destino: Objeto,
    campo = chave,
  ) {
    if (!(chave in origem) || origem[chave] === undefined) return;
    const valor = origem[chave];
    if (valor === null) {
      destino[chave] = null;
      return;
    }
    if (typeof valor !== 'string' || !valor.trim()) {
      this.erro(campo, 'Informe um texto ou null para limpar.');
      return;
    }
    if (valor.trim().length > maximo)
      this.erro(campo, `Use até ${maximo} caracteres.`);
    else destino[chave] = valor.trim();
  }
  dataOpcional(origem: Objeto, chave: string, destino: Objeto, campo = chave) {
    if (!(chave in origem) || origem[chave] === undefined) return;
    const valor = origem[chave];
    if (valor === null) destino[chave] = null;
    else if (dataCivilValida(valor)) destino[chave] = valor;
    else this.erro(campo, 'Use uma data válida no formato AAAA-MM-DD.');
  }
}

function contatoValido(tipo: string, valor: string): string | null {
  if (tipo === 'email')
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
      ? null
      : 'Informe um e-mail válido.';
  if (tipo === 'telefone')
    return /^[\d+()\-.\s/xX#,]{6,40}$/.test(valor) &&
      (valor.match(/\d/g)?.length ?? 0) >= 4
      ? null
      : 'Informe um telefone válido (dígitos, DDI, ramal).';
  if (tipo === 'site')
    return /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(valor) ||
      /^https?:\/\/localhost(:\d+)?(\/\S*)?$/i.test(valor)
      ? null
      : 'Informe uma URL iniciada por http:// ou https://.';
  return /^(https?:\/\/\S+|@?[\w.-]{2,100})$/i.test(valor)
    ? null
    : 'Informe a URL ou o usuário da rede social.';
}

function validarContatos(
  entrada: unknown,
  c: Coletor,
): ContatoEntrada[] | undefined {
  if (!Array.isArray(entrada)) {
    c.erro('contatos', 'Informe a lista de contatos.');
    return undefined;
  }
  if (entrada.length > LIMITES_CADASTRO.contatos)
    c.erro('contatos', `Use até ${LIMITES_CADASTRO.contatos} contatos.`);
  const saida: ContatoEntrada[] = [];
  const ids = new Set<number>();
  entrada.forEach((item, i) => {
    const caminho = `contatos[${i}]`;
    if (!objeto(item)) return c.erro(caminho, 'Contato inválido.');
    const permitidos = [
      'id',
      'tipo',
      'valor',
      'finalidade',
      'responsavelNome',
      'responsavelCargo',
    ];
    for (const chave of Object.keys(item))
      if (!permitidos.includes(chave))
        c.erro(`${caminho}.${chave}`, 'Campo não permitido.');
    const resultado: Objeto = {};
    if (item.id !== undefined) {
      if (!inteiroPositivo(item.id) || ids.has(item.id))
        c.erro(`${caminho}.id`, 'ID de contato inválido ou repetido.');
      else {
        ids.add(item.id);
        resultado.id = item.id;
      }
    }
    if (!(TIPOS_CONTATO as readonly unknown[]).includes(item.tipo))
      c.erro(`${caminho}.tipo`, `Use: ${TIPOS_CONTATO.join(', ')}.`);
    else resultado.tipo = item.tipo;
    if (!(FINALIDADES_CONTATO as readonly unknown[]).includes(item.finalidade))
      c.erro(
        `${caminho}.finalidade`,
        `Use: ${FINALIDADES_CONTATO.join(', ')}.`,
      );
    else resultado.finalidade = item.finalidade;
    if (typeof item.valor !== 'string' || !item.valor.trim())
      c.erro(`${caminho}.valor`, 'Informe o contato.');
    else if (item.valor.trim().length > LIMITES_CADASTRO.contatoValor)
      c.erro(
        `${caminho}.valor`,
        `Use até ${LIMITES_CADASTRO.contatoValor} caracteres.`,
      );
    else {
      const valor = item.valor.trim();
      const problema =
        typeof item.tipo === 'string' ? contatoValido(item.tipo, valor) : null;
      if (problema) c.erro(`${caminho}.valor`, problema);
      else resultado.valor = valor;
    }
    c.textoOpcional(
      item,
      'responsavelNome',
      LIMITES_CADASTRO.responsavelNome,
      resultado,
      `${caminho}.responsavelNome`,
    );
    c.textoOpcional(
      item,
      'responsavelCargo',
      LIMITES_CADASTRO.responsavelCargo,
      resultado,
      `${caminho}.responsavelCargo`,
    );
    saida.push(resultado as unknown as ContatoEntrada);
  });
  return saida;
}

function validarCadastur(
  entrada: unknown,
  c: Coletor,
): CadasturEntrada[] | undefined {
  if (!Array.isArray(entrada)) {
    c.erro('cadastur', 'Informe a lista de registros de Cadastur.');
    return undefined;
  }
  if (entrada.length > LIMITES_CADASTRO.cadastur)
    c.erro('cadastur', `Use até ${LIMITES_CADASTRO.cadastur} registros.`);
  const saida: CadasturEntrada[] = [];
  const ids = new Set<number>();
  entrada.forEach((item, i) => {
    const caminho = `cadastur[${i}]`;
    if (!objeto(item)) return c.erro(caminho, 'Registro inválido.');
    for (const chave of Object.keys(item))
      if (!['id', 'situacao', 'numero', 'vencimento'].includes(chave))
        c.erro(`${caminho}.${chave}`, 'Campo não permitido.');
    const resultado: Objeto = {};
    if (item.id !== undefined) {
      if (!inteiroPositivo(item.id) || ids.has(item.id))
        c.erro(`${caminho}.id`, 'ID de Cadastur inválido ou repetido.');
      else {
        ids.add(item.id);
        resultado.id = item.id;
      }
    }
    if (!(SITUACOES_CADASTUR as readonly unknown[]).includes(item.situacao))
      c.erro(`${caminho}.situacao`, `Use: ${SITUACOES_CADASTUR.join(', ')}.`);
    else resultado.situacao = item.situacao;
    c.textoOpcional(
      item,
      'numero',
      LIMITES_CADASTRO.cadasturNumero,
      resultado,
      `${caminho}.numero`,
    );
    c.dataOpcional(item, 'vencimento', resultado, `${caminho}.vencimento`);
    // Coerência entre situação e número/vencimento (regra técnica; R07 segue pendente).
    const situacao = resultado.situacao;
    if (
      situacao === 'nao_possui' &&
      (resultado.numero != null || resultado.vencimento != null)
    )
      c.erro(
        caminho,
        'Sem Cadastur (nao_possui) não há número nem vencimento.',
      );
    if (situacao === 'numero_proprio' && !resultado.numero)
      c.erro(`${caminho}.numero`, 'Informe o número do Cadastur.');
    if (situacao === 'igual_cnpj' && resultado.numero != null)
      c.erro(
        `${caminho}.numero`,
        'Com Cadastur igual ao CNPJ não se informa outro número.',
      );
    saida.push(resultado as unknown as CadasturEntrada);
  });
  return saida;
}

function validarCoordenadas(
  entrada: unknown,
  c: Coletor,
): Coordenadas | null | undefined {
  if (entrada === null) return null;
  if (!objeto(entrada)) {
    c.erro('localizacao', 'Informe longitude e latitude ou null.');
    return undefined;
  }
  for (const chave of Object.keys(entrada))
    if (!['longitude', 'latitude'].includes(chave))
      c.erro(`localizacao.${chave}`, 'Campo não permitido.');
  const { longitude, latitude } = entrada;
  let ok = true;
  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    c.erro('localizacao.longitude', 'Longitude deve estar entre -180 e 180.');
    ok = false;
  }
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    c.erro('localizacao.latitude', 'Latitude deve estar entre -90 e 90.');
    ok = false;
  }
  return ok
    ? { longitude: longitude as number, latitude: latitude as number }
    : undefined;
}

const CAMPOS = [
  'nomeFantasia',
  'situacao',
  'segmentoIds',
  'razaoSocial',
  'cnpj',
  'idOrigem',
  'tipoHospedagem',
  'categoriaIndicador',
  'endereco',
  'zona',
  'localizacao',
  'dataInicioAtividades',
  'dataEncerramento',
  'contatos',
  'cadastur',
  'confirmarSemDuplicidade',
] as const;

/**
 * Valida e normaliza a entrada de criação ou atualização. Rejeita campos desconhecidos,
 * normaliza texto (trim) e CNPJ (14 dígitos) e preserva a diferença entre omitido e null.
 */
export function validarEntradaEmpreendimento(
  entrada: unknown,
  modo: 'criar',
): ResultadoEntrada<EntradaEmpreendimento>;
export function validarEntradaEmpreendimento(
  entrada: unknown,
  modo: 'alterar',
): ResultadoEntrada<AlteracaoEmpreendimento>;
export function validarEntradaEmpreendimento(
  entrada: unknown,
  modo: 'criar' | 'alterar',
): ResultadoEntrada<EntradaEmpreendimento | AlteracaoEmpreendimento> {
  const c = new Coletor();
  if (!objeto(entrada))
    return {
      valido: false,
      erros: [{ field: '', message: 'Corpo inválido.' }],
    };
  for (const chave of Object.keys(entrada))
    if (!(CAMPOS as readonly string[]).includes(chave))
      c.erro(chave, 'Campo não permitido.');
  const saida: Objeto = {};

  if (modo === 'criar' || entrada.nomeFantasia !== undefined) {
    if (
      typeof entrada.nomeFantasia !== 'string' ||
      !entrada.nomeFantasia.trim()
    )
      c.erro('nomeFantasia', 'Informe o nome fantasia.');
    else if (entrada.nomeFantasia.trim().length > LIMITES_CADASTRO.nome)
      c.erro('nomeFantasia', `Use até ${LIMITES_CADASTRO.nome} caracteres.`);
    else saida.nomeFantasia = entrada.nomeFantasia.trim();
  }
  if (modo === 'criar' || entrada.situacao !== undefined) {
    if (
      !(SITUACOES_EMPREENDIMENTO as readonly unknown[]).includes(
        entrada.situacao,
      )
    )
      c.erro(
        'situacao',
        `Informe a situação: ${SITUACOES_EMPREENDIMENTO.join(' ou ')}.`,
      );
    else saida.situacao = entrada.situacao;
  }
  if (modo === 'criar' || entrada.segmentoIds !== undefined) {
    const ids = entrada.segmentoIds;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > LIMITES_CADASTRO.segmentos ||
      !ids.every(inteiroPositivo) ||
      new Set(ids).size !== ids.length
    )
      c.erro(
        'segmentoIds',
        'Informe ao menos um segmento (IDs positivos, sem repetição).',
      );
    else saida.segmentoIds = ids;
  }
  c.textoOpcional(entrada, 'razaoSocial', LIMITES_CADASTRO.nome, saida);
  c.textoOpcional(entrada, 'idOrigem', LIMITES_CADASTRO.idOrigem, saida);
  c.textoOpcional(
    entrada,
    'tipoHospedagem',
    LIMITES_CADASTRO.tipoOuCategoria,
    saida,
  );
  c.textoOpcional(
    entrada,
    'categoriaIndicador',
    LIMITES_CADASTRO.tipoOuCategoria,
    saida,
  );
  c.textoOpcional(entrada, 'endereco', LIMITES_CADASTRO.endereco, saida);
  c.dataOpcional(entrada, 'dataInicioAtividades', saida);
  c.dataOpcional(entrada, 'dataEncerramento', saida);

  if (entrada.cnpj !== undefined) {
    if (entrada.cnpj === null) saida.cnpj = null;
    else if (typeof entrada.cnpj !== 'string' || !normalizarCnpj(entrada.cnpj))
      c.erro('cnpj', 'Informe um CNPJ com 14 dígitos (a máscara é opcional).');
    else saida.cnpj = normalizarCnpj(entrada.cnpj);
  }
  if (entrada.zona !== undefined) {
    if (entrada.zona === null) saida.zona = null;
    else if (!(ZONAS as readonly unknown[]).includes(entrada.zona))
      c.erro('zona', `Use: ${ZONAS.join(' ou ')}.`);
    else saida.zona = entrada.zona;
  }
  if (entrada.localizacao !== undefined) {
    const coordenadas = validarCoordenadas(entrada.localizacao, c);
    if (coordenadas !== undefined) saida.localizacao = coordenadas;
  }
  if (entrada.contatos !== undefined) {
    const contatos = validarContatos(entrada.contatos, c);
    if (contatos) saida.contatos = contatos;
  }
  if (entrada.cadastur !== undefined) {
    const cadastur = validarCadastur(entrada.cadastur, c);
    if (cadastur) saida.cadastur = cadastur;
  }
  if (entrada.confirmarSemDuplicidade !== undefined) {
    if (typeof entrada.confirmarSemDuplicidade !== 'boolean')
      c.erro('confirmarSemDuplicidade', 'Use verdadeiro ou falso.');
    else saida.confirmarSemDuplicidade = entrada.confirmarSemDuplicidade;
  }

  // Coerência dentro do próprio corpo (a do estado final é conferida no servidor).
  if (
    saida.situacao === 'encerrado' &&
    modo === 'criar' &&
    !saida.dataEncerramento
  )
    c.erro('dataEncerramento', 'Informe a data de encerramento.');
  if (saida.situacao === 'ativo' && saida.dataEncerramento)
    c.erro(
      'dataEncerramento',
      'Empreendimento ativo não tem data de encerramento.',
    );
  if (
    typeof saida.dataInicioAtividades === 'string' &&
    typeof saida.dataEncerramento === 'string' &&
    saida.dataEncerramento < saida.dataInicioAtividades
  )
    c.erro(
      'dataEncerramento',
      'O encerramento não pode ser anterior ao início das atividades.',
    );
  if (modo === 'alterar' && !Object.keys(saida).length && !c.erros.length)
    c.erro('', 'Informe ao menos um campo para atualizar.');
  return c.erros.length
    ? { valido: false, erros: c.erros }
    : {
        valido: true,
        data: saida as unknown as EntradaEmpreendimento,
      };
}
