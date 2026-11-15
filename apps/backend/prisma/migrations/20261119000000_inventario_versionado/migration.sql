-- Plano 06: inventário versionado (vigência sem sobreposição, correção por substituição e estados).
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE inventario_versao
  ADD COLUMN criada_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN motivo TEXT,
  ADD COLUMN estados JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN substituida_por_id INTEGER,
  ADD CONSTRAINT inventario_versao_substituida_por_id_fkey FOREIGN KEY (substituida_por_id)
    REFERENCES inventario_versao(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT inventario_versao_vigencia_check
    CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio),
  ADD CONSTRAINT inventario_versao_tipo_alteracao_check
    CHECK (tipo_alteracao IN ('correcao','mudanca_real')),
  ADD CONSTRAINT inventario_versao_situacao_conferencia_check
    CHECK (situacao_conferencia IN ('completo','parcial','pendente')),
  ADD CONSTRAINT inventario_versao_quantidades_check CHECK (
    COALESCE(total_uh, 0) >= 0 AND COALESCE(leitos, 0) >= 0 AND COALESCE(max_leitos_por_uh, 0) >= 0
    AND COALESCE(uhs_pcd, 0) >= 0 AND COALESCE(func_fixos, 0) >= 0 AND COALESCE(func_temporarios, 0) >= 0),
  ADD CONSTRAINT inventario_versao_estados_check CHECK (jsonb_typeof(estados) = 'object'),
  ADD CONSTRAINT inventario_versao_substituida_check CHECK (substituida_por_id IS NULL OR substituida_por_id <> id);

-- Versões não substituídas de um empreendimento não se sobrepõem (datas civis, fim inclusivo; fim nulo
-- = aberto). Adiável: uma correção insere a nova versão e marca a anterior na mesma transação.
ALTER TABLE inventario_versao
  ADD CONSTRAINT inventario_versao_vigencia_excl EXCLUDE USING gist (
    empreendimento_id WITH =,
    daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]') WITH &&
  ) WHERE (substituida_por_id IS NULL) DEFERRABLE INITIALLY DEFERRED;

-- O conteúdo de uma versão não é reescrito: só o fim da vigência, a conferência e a substituição mudam.
CREATE FUNCTION proteger_inventario_versao() RETURNS trigger AS $$
BEGIN
  IF OLD.empreendimento_id IS DISTINCT FROM NEW.empreendimento_id
    OR OLD.criada_por IS DISTINCT FROM NEW.criada_por
    OR OLD.criada_em IS DISTINCT FROM NEW.criada_em
    OR OLD.vigencia_inicio IS DISTINCT FROM NEW.vigencia_inicio
    OR OLD.tipo_alteracao IS DISTINCT FROM NEW.tipo_alteracao
    OR OLD.total_uh IS DISTINCT FROM NEW.total_uh
    OR OLD.leitos IS DISTINCT FROM NEW.leitos
    OR OLD.max_leitos_por_uh IS DISTINCT FROM NEW.max_leitos_por_uh
    OR OLD.uhs_pcd IS DISTINCT FROM NEW.uhs_pcd
    OR OLD.func_fixos IS DISTINCT FROM NEW.func_fixos
    OR OLD.func_temporarios IS DISTINCT FROM NEW.func_temporarios
    OR OLD.checkin IS DISTINCT FROM NEW.checkin
    OR OLD.checkout IS DISTINCT FROM NEW.checkout
    OR OLD.funciona_24h IS DISTINCT FROM NEW.funciona_24h
    OR OLD.estados IS DISTINCT FROM NEW.estados
    OR OLD.motivo IS DISTINCT FROM NEW.motivo
    OR (OLD.substituida_por_id IS NOT NULL AND OLD.substituida_por_id IS DISTINCT FROM NEW.substituida_por_id)
  THEN
    RAISE EXCEPTION 'conteúdo de inventario_versao é imutável; registre nova versão';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER inventario_versao_protegida
  BEFORE UPDATE ON inventario_versao
  FOR EACH ROW EXECUTE FUNCTION proteger_inventario_versao();

CREATE FUNCTION impedir_alteracao_inventario_item() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'inventario_item é imutável; registre nova versão do inventário';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER inventario_item_imutavel
  BEFORE UPDATE ON inventario_item
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_inventario_item();

CREATE INDEX inventario_versao_substituida_por_id_idx ON inventario_versao(substituida_por_id);
COMMIT;
