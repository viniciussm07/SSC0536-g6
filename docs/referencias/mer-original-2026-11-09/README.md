# MER original recebido — 09/11/2026

Este diretório preserva o MER recebido na branch `feat/db-mer`
(commit `550b98b`, "feat(DB Docs): add DB MER in Mermaid and PNG").

- `mer.mmd`: diagrama Mermaid original, com **26 tabelas**.
- `MER.png`: imagem original exportada.

O conteúdo foi mantido como referência histórica. Ele **não representa o schema
implementado na `main`**: o `apps/backend/prisma/schema.prisma` já contém 34 tabelas,
incluindo autenticação, permissões, visibilidade de indicadores, política de acesso e
versionamento de catálogo. Consulte o [MER implementado](../../mer.mmd), sua
[versão em PNG](../../mer.png) e o [modelo de dados](../../arquitetura/modelo-de-dados.md).

A branch original está baseada em um `master` antigo e não deve ser mergeada na `main`;
apenas estes arquivos foram preservados.
