BEGIN;
ALTER TABLE auditoria
  ALTER COLUMN usuario_id DROP NOT NULL,
  ALTER COLUMN em SET DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN autor_nome TEXT,
  ADD COLUMN origem TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN processo TEXT,
  ADD COLUMN correlacao_id TEXT;
UPDATE auditoria a SET autor_nome = u.nome FROM usuario u WHERE u.id = a.usuario_id;
-- Marcadores sintéticos já existentes são processos de carga, sem autoria humana fictícia.
UPDATE auditoria SET origem = 'automatica', processo = 'db:seed', usuario_id = NULL, autor_nome = 'db:seed'
WHERE entidade IN ('fixture_dataset','fixture_demo_access','fixture_profile_access');
ALTER TABLE auditoria ADD CONSTRAINT auditoria_origem_check CHECK (
  (origem = 'manual' AND usuario_id IS NOT NULL AND processo IS NULL)
  OR (origem = 'automatica' AND usuario_id IS NULL AND processo IS NOT NULL AND length(processo) > 0)
);
CREATE INDEX auditoria_em_id_idx ON auditoria(em, id);
CREATE INDEX auditoria_correlacao_id_idx ON auditoria(correlacao_id);
-- Preserva o nome no instante do evento inclusive em gravações operacionais fora do HTTP.
CREATE FUNCTION preencher_autor_auditoria() RETURNS trigger AS $$
BEGIN
  IF NEW.autor_nome IS NULL THEN
    IF NEW.origem = 'automatica' THEN NEW.autor_nome := NEW.processo;
    ELSE SELECT nome INTO NEW.autor_nome FROM usuario WHERE id = NEW.usuario_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER auditoria_autor BEFORE INSERT ON auditoria
FOR EACH ROW EXECUTE FUNCTION preencher_autor_auditoria();
CREATE FUNCTION impedir_alteracao_auditoria() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'auditoria é imutável: não é permitido alterar, excluir ou truncar eventos';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER auditoria_imutavel BEFORE UPDATE OR DELETE ON auditoria
FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_auditoria();
CREATE TRIGGER auditoria_sem_truncate BEFORE TRUNCATE ON auditoria
FOR EACH STATEMENT EXECUTE FUNCTION impedir_alteracao_auditoria();
REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM PUBLIC;
COMMIT;
