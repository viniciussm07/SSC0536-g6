-- Imutabilidade dos snapshots de versão do modelo de pesquisa (espelha catalogo_item_versao).
CREATE FUNCTION impedir_alteracao_pesquisa_modelo_versao() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'pesquisa_modelo_versao é imutável';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pesquisa_modelo_versao_imutavel
  BEFORE UPDATE OR DELETE ON pesquisa_modelo_versao
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_pesquisa_modelo_versao();

CREATE FUNCTION impedir_alteracao_pesquisa_campo_versao() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'pesquisa_campo_versao é imutável';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pesquisa_campo_versao_imutavel
  BEFORE UPDATE OR DELETE ON pesquisa_campo_versao
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_pesquisa_campo_versao();
