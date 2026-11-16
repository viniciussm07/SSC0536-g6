BEGIN;
INSERT INTO permissao_perfil (perfil, recurso, acao, escopo)
SELECT perfil, recurso, 'exportar', escopo
FROM permissao_perfil
WHERE recurso IN ('catalogos', 'auditoria') AND acao = 'consultar'
  AND escopo = 'todos' AND perfil = 'administrador'
ON CONFLICT (perfil, recurso, acao) DO NOTHING;
UPDATE politica_acesso SET revisao = revisao + 1 WHERE id = 1;
COMMIT;
