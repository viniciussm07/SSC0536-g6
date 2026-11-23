import { isPerfil, isPermissaoAcesso } from './permissoes.validators.js';
import type {
  AcessoAtual,
  ContaResumo,
  CodigoAtivacaoConta,
  EmpreendimentoResumo,
  RespostaResumo,
  InventarioResumo,
  IndicadorConsulta,
  VinculoConta,
  VisibilidadeIndicador,
} from './permissoes.types.js';

function objeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
export function isAcessoAtual(value: unknown): value is AcessoAtual {
  return (
    objeto(value) &&
    id(value.usuarioId) &&
    isPerfil(value.perfil) &&
    id(value.revisao) &&
    Array.isArray(value.permissoes) &&
    value.permissoes.every(isPermissaoAcesso) &&
    Array.isArray(value.vinculos) &&
    value.vinculos.every(
      (v) =>
        objeto(v) &&
        id(v.empreendimentoId) &&
        typeof v.nomeFantasia === 'string' &&
        (v.cnpj === null || typeof v.cnpj === 'string'),
    )
  );
}
export function isContaResumo(value: unknown): value is ContaResumo {
  return (
    objeto(value) &&
    id(value.id) &&
    typeof value.nome === 'string' &&
    typeof value.email === 'string' &&
    typeof value.perfil === 'string' &&
    typeof value.ativo === 'boolean'
  );
}
export function isCodigoAtivacaoConta(
  value: unknown,
): value is CodigoAtivacaoConta {
  return (
    objeto(value) &&
    id(value.usuarioId) &&
    typeof value.token === 'string' &&
    /^[a-f0-9]{64}$/.test(value.token) &&
    typeof value.expiraEm === 'string' &&
    Number.isFinite(Date.parse(value.expiraEm))
  );
}
export function isEmpreendimentoResumo(
  value: unknown,
): value is EmpreendimentoResumo {
  return (
    objeto(value) &&
    id(value.id) &&
    typeof value.nomeFantasia === 'string' &&
    (value.cnpj === null || typeof value.cnpj === 'string') &&
    typeof value.situacao === 'string'
  );
}
export function isRespostaResumo(value: unknown): value is RespostaResumo {
  return (
    objeto(value) &&
    id(value.id) &&
    id(value.pesquisaId) &&
    typeof value.titulo === 'string' &&
    typeof value.respondidaEm === 'string' &&
    Number.isFinite(Date.parse(value.respondidaEm)) &&
    typeof value.canal === 'string'
  );
}
export function isInventarioResumo(value: unknown): value is InventarioResumo {
  const quantidade = (v: unknown) =>
    v === null || (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0);
  return (
    objeto(value) &&
    id(value.id) &&
    typeof value.vigenciaInicio === 'string' &&
    /^\d{4}-\d\d-\d\d$/.test(value.vigenciaInicio) &&
    (value.vigenciaFim === null ||
      (typeof value.vigenciaFim === 'string' &&
        /^\d{4}-\d\d-\d\d$/.test(value.vigenciaFim))) &&
    quantidade(value.totalUh) &&
    quantidade(value.leitos) &&
    typeof value.situacaoConferencia === 'string' &&
    typeof value.tipoAlteracao === 'string' &&
    typeof value.criadaEm === 'string' &&
    !Number.isNaN(Date.parse(value.criadaEm)) &&
    typeof value.autor === 'string' &&
    (value.substituidaPorId === null || id(value.substituidaPorId))
  );
}
export function isIndicadorConsulta(
  value: unknown,
): value is IndicadorConsulta {
  return (
    objeto(value) &&
    id(value.id) &&
    id(value.periodoId) &&
    id(value.indicadorId) &&
    ['nome', 'unidade', 'periodo', 'tipoColeta', 'recorte', 'metodo'].every(
      (key) => typeof value[key] === 'string',
    ) &&
    typeof value.valor === 'string' &&
    /^-?\d+(?:\.\d+)?$/.test(value.valor)
  );
}
export function isVinculoConta(value: unknown): value is VinculoConta {
  return (
    objeto(value) &&
    id(value.empreendimentoId) &&
    typeof value.nomeFantasia === 'string' &&
    typeof value.ativo === 'boolean'
  );
}
export function isVisibilidadeIndicador(
  value: unknown,
): value is VisibilidadeIndicador {
  return (
    objeto(value) &&
    id(value.indicadorId) &&
    typeof value.nome === 'string' &&
    typeof value.permitido === 'boolean'
  );
}
