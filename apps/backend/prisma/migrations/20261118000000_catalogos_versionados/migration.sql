-- Plano 05: catálogos versionados do inventário e permissão de gestão de catálogos.
BEGIN;

ALTER TABLE catalogo_grupo
  ADD COLUMN secao TEXT,
  ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true,
  ADD CONSTRAINT catalogo_grupo_selecao_check CHECK (selecao IN ('unica','multipla'));

ALTER TABLE catalogo_item
  ADD COLUMN outro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN aceita_quantidade BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN versao_atual INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT catalogo_item_versao_atual_check CHECK (versao_atual >= 1);

CREATE TABLE catalogo_item_versao (
  item_id INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  rotulo TEXT NOT NULL,
  pergunta TEXT NOT NULL,
  selecao TEXT NOT NULL,
  exclusivo BOOLEAN NOT NULL,
  outro BOOLEAN NOT NULL,
  aceita_quantidade BOOLEAN NOT NULL,
  criada_em TIMESTAMP(6) NOT NULL,
  criada_por INTEGER,
  motivo TEXT,
  CONSTRAINT catalogo_item_versao_pkey PRIMARY KEY (item_id, numero),
  CONSTRAINT catalogo_item_versao_numero_check CHECK (numero >= 1),
  CONSTRAINT catalogo_item_versao_selecao_check CHECK (selecao IN ('unica','multipla')),
  CONSTRAINT catalogo_item_versao_item_id_fkey FOREIGN KEY (item_id) REFERENCES catalogo_item(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT catalogo_item_versao_criada_por_fkey FOREIGN KEY (criada_por) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Versão 1 de todo item já existente (fixtures e cargas anteriores).
INSERT INTO catalogo_item_versao(item_id, numero, rotulo, pergunta, selecao, exclusivo, outro, aceita_quantidade, criada_em)
SELECT i.id, 1, i.rotulo, g.pergunta, g.selecao, i.exclusivo, i.outro, i.aceita_quantidade, CURRENT_TIMESTAMP
FROM catalogo_item i JOIN catalogo_grupo g ON g.id = i.grupo_id;

-- Snapshots não mudam: correção vira nova versão, nunca UPDATE/DELETE.
CREATE FUNCTION impedir_alteracao_catalogo_item_versao() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'catalogo_item_versao é imutável';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER catalogo_item_versao_imutavel
  BEFORE UPDATE OR DELETE ON catalogo_item_versao
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_catalogo_item_versao();

ALTER TABLE inventario_item
  ADD COLUMN item_versao INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT inventario_item_item_id_item_versao_fkey FOREIGN KEY (item_id, item_versao)
    REFERENCES catalogo_item_versao(item_id, numero) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO permissao_perfil(perfil,recurso,acao,escopo) VALUES
('administrador','catalogos','consultar','todos'),
('administrador','catalogos','criar','todos'),
('administrador','catalogos','alterar','todos');
UPDATE politica_acesso SET revisao = revisao + 1 WHERE id = 1;

COMMIT;
