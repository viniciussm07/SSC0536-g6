BEGIN;
CREATE TABLE credencial_local (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  senha_hash TEXT NOT NULL
);
CREATE TABLE sessao (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  criada_em TIMESTAMPTZ(6) NOT NULL,
  expira_em TIMESTAMPTZ(6) NOT NULL,
  revogada_em TIMESTAMPTZ(6)
);
CREATE INDEX sessao_usuario_id_idx ON sessao(usuario_id);
CREATE TABLE ativacao_conta (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  expira_em TIMESTAMPTZ(6) NOT NULL,
  usada_em TIMESTAMPTZ(6)
);
CREATE INDEX ativacao_conta_usuario_id_idx ON ativacao_conta(usuario_id);
CREATE TABLE limite_autenticacao (
  chave TEXT PRIMARY KEY,
  tentativas INTEGER NOT NULL,
  expira_em TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX limite_autenticacao_expira_em_idx ON limite_autenticacao(expira_em);
COMMIT;
