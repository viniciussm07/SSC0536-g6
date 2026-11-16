import type {
  CampoModelo,
  ModeloPesquisaDetalhe,
  ModeloPesquisaLinha,
  OpcaoCampo,
  TipoValorCampo,
  VersaoModeloLinha,
} from '@ssc0536/common';

type CampoBanco = {
  id: number;
  chave: string;
  rotulo: string;
  tipoValor: string;
  obrigatorio: boolean;
  ordem: number;
  opcoes: { chave: string; rotulo: string; ordem: number }[];
};

type ModeloBanco = {
  id: number;
  nome: string;
  publicoAlvo: string;
  versaoAtual: number;
  criadaEm: Date;
};

const paraCampo = (c: CampoBanco): CampoModelo & { id: number } => ({
  id: c.id,
  chave: c.chave,
  rotulo: c.rotulo,
  tipoValor: c.tipoValor as TipoValorCampo,
  obrigatorio: c.obrigatorio,
  ordem: c.ordem,
  opcoes: c.opcoes
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((o): OpcaoCampo => ({
      chave: o.chave,
      rotulo: o.rotulo,
      ordem: o.ordem,
    })),
});

export const paraLinha = (row: ModeloBanco): ModeloPesquisaLinha => ({
  id: row.id,
  nome: row.nome,
  publicoAlvo: row.publicoAlvo,
  versao: row.versaoAtual,
  criadaEm: row.criadaEm.toISOString(),
});

export const paraDetalhe = (
  row: ModeloBanco & { campos: CampoBanco[] },
): ModeloPesquisaDetalhe => ({
  ...paraLinha(row),
  campos: row.campos
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map(paraCampo),
});

export const paraVersaoLinha = (row: {
  numero: number;
  nome: string;
  publicoAlvo: string;
  criadaEm: Date;
  motivo: string | null;
}): VersaoModeloLinha => ({
  numero: row.numero,
  nome: row.nome,
  publicoAlvo: row.publicoAlvo,
  criadaEm: row.criadaEm.toISOString(),
  motivo: row.motivo,
});
