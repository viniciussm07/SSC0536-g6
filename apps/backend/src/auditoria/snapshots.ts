import type { SnapshotAuditoria, ValorAuditoria } from '@ssc0536/common';

/** Lista positiva: um domínio novo precisa declarar seus campos antes de expô-los. */
const CAMPOS: Readonly<Record<string, readonly string[]>> = {
  conta: ['id', 'nome', 'email', 'perfil', 'ativo', 'evento'],
  empreendimento: [
    'nomeFantasia',
    'razaoSocial',
    'cnpj',
    'idOrigem',
    'situacao',
    'tipoHospedagem',
    'categoriaIndicador',
    'endereco',
    'zona',
    'localizacao',
    'dataInicioAtividades',
    'dataEncerramento',
    'segmentos',
    'contatos',
    'cadastur',
    'duplicidadesConfirmadas',
  ],
  inventario_versao: [
    'empreendimentoId',
    'tipoAlteracao',
    'vigenciaInicio',
    'vigenciaFim',
    'corrige',
    'motivo',
    'capacidade',
    'itens',
    'substituidaPorId',
    'situacaoConferencia',
  ],
  usuario_empreendimento: ['usuarioId', 'empreendimentoId', 'ativo'],
  permissao_perfil: ['perfil', 'permissoes'],
  visibilidade_indicador_perfil: ['perfil', 'indicadorId', 'permitido'],
  catalogo_grupo: [
    'segmentoId',
    'chave',
    'pergunta',
    'selecao',
    'permiteOutro',
    'secao',
    'ordem',
    'ativo',
    'itensVersionados',
    'motivo',
  ],
  catalogo_item: [
    'grupoId',
    'chave',
    'rotulo',
    'exclusivo',
    'outro',
    'aceitaQuantidade',
    'ordem',
    'ativo',
    'versao',
    'motivo',
  ],
  periodo: ['tipo', 'rotulo', 'dataInicio', 'dataFim'],
  importacao_decisao: [
    'loteId',
    'linhaId',
    'tipo',
    'empreendimentoId',
    'motivo',
    'conflito',
    'origem',
  ],
  importacao_lote: [
    'fonte',
    'nomeArquivo',
    'tamanhoBytes',
    'sha256',
    'versaoParser',
    'estado',
    'linhas',
    'erros',
    'avisos',
    'destino',
    'confirmacao',
    'criadas',
    'atualizadas',
    'semMudanca',
    'pendentes',
    'conflitos',
    'rejeitadas',
  ],
  pesquisa_modelo: ['nome', 'publicoAlvo', 'campos', 'versao', 'motivo'],
  pesquisa: [
    'titulo',
    'tipoColeta',
    'status',
    'abertura',
    'prazo',
    'modeloId',
    'modeloVersao',
    'segmentoIds',
    'periodoIds',
    'destinatarios',
    'motivo',
  ],
  resposta: ['pesquisaId', 'empreendimentoId', 'canal', 'itens'],
  coleta_diaria: [
    'empreendimentoId',
    'empreendimentoNome',
    'periodoId',
    'periodoRotulo',
    'fonte',
    'dataColeta',
    'dataEstadia',
    'tipoDia',
    'valorDiaria',
    'moeda',
    'unidadePreco',
    'origem',
    'situacaoConferencia',
    'referenciaOrigem',
    'observacao',
    'conferidoEm',
    'conferidoPor',
  ],
  rhc_periodo: [
    'periodoId',
    'periodoRotulo',
    'qtdRhc',
    'leitos',
    'origem',
    'situacaoConferencia',
    'revisao',
    'observacao',
    'conferidoEm',
    'conferidoPor',
  ],
  parametro_calculo: [
    'chave',
    'valor',
    'unidade',
    'vigenciaInicio',
    'vigenciaFim',
    'fonte',
    'situacao',
    'observacao',
  ],
  fixture_dataset: [
    'synthetic',
    'version',
    'referenceDate',
    'sha256',
    'description',
  ],
  fixture_demo_access: ['synthetic', 'version', 'sha256'],
  fixture_profile_access: ['synthetic', 'version', 'sha256'],
};
const segredo = (chave: string) =>
  /senha|password|token|secret|cookie|credencial|authorization|autorizacao/i.test(
    chave,
  );
function limpar(valor: unknown, profundidade = 0): ValorAuditoria {
  if (profundidade > 20) return '[limite de profundidade]';
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean')
    return valor;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor))
    return valor.map((v) => limpar(v, profundidade + 1));
  if (typeof valor !== 'object' || !valor) return null;
  return Object.fromEntries(
    Object.entries(valor)
      .filter(
        ([k, v]) =>
          !segredo(k) &&
          v !== undefined &&
          !['__proto__', 'constructor', 'prototype'].includes(k),
      )
      .map(([k, v]) => [k, limpar(v, profundidade + 1)]),
  );
}
/** Usada na gravação e na leitura, inclusive para proteger snapshots legados. */
export function snapshotSeguro(
  entidade: string,
  valor: unknown,
): SnapshotAuditoria | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'object' || Array.isArray(valor)) return {};
  const permitidos = CAMPOS[entidade] ?? [];
  return limpar(
    Object.fromEntries(
      Object.entries(valor).filter(
        ([k, v]) => permitidos.includes(k) && v !== undefined,
      ),
    ),
  ) as SnapshotAuditoria;
}
