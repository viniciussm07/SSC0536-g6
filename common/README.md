# Contratos compartilhados

O pacote `@ssc0536/common` é a fonte compartilhada de constantes e contratos de API
entre React e Nest. Importe pelo nome do pacote, nunca por caminhos internos de outro app.

## Organização

Agrupe o código pelo domínio que define seu significado. Convenções HTTP transversais
ficam em `api/`; cada funcionalidade tem sua própria pasta, como `health/`.
O domínio `coleta/` implementa o [contrato canônico de dados v1](../docs/contratos/README.md):
estados de entrada e normalização portável para entrada manual e importação após leitura
da célula. Esses normalizadores preparam candidatos para conferência; não persistem
dados, não resolvem identidade e não substituem validação/autorização no servidor.
`inventario/` reúne o contrato de capacidade e sua normalização por campo, usando
os mesmos normalizadores de coleta, sem depender do modelo Prisma.

```text
common/
  src/
    api/
      api.constants.ts
      api-response.types.ts
      api-error.types.ts
      pagination.constants.ts
      pagination.types.ts
      index.ts
    health/
      health.constants.ts
      health.types.ts
      health.validators.ts
      index.ts
    index.ts
  test/
    health/
      health.validators.test.mjs
    exports.test.mjs
```

### Regras para crescer

- Crie uma pasta por domínio quando houver código compartilhado real, por exemplo,
  `empreendimentos/` ou `pesquisas/`. Não antecipe pastas vazias.
- Nomeie arquivos em kebab-case, com assunto e responsabilidade: `.types.ts` para
  contratos/tipos, `.constants.ts` para valores e `.validators.ts` para validação em runtime.
  Divida por assunto quando crescer; evite arquivos globais `constants.ts`, `contracts.ts`
  ou `utils.ts` acumulando funcionalidades diferentes.
- Cada domínio declara exports explícitos em seu `index.ts`; `src/index.ts` apenas
  reúne a superfície pública. Exporte tipos com `export type`.
- Dentro do pacote, importe diretamente do arquivo relativo com extensão `.js`.
  Não importe a raiz de dentro de um domínio; evite ciclos. Um domínio não deve depender
  de outro para definir uma convenção HTTP genérica: esse conteúdo pertence a `api/`.
- Nos apps, importe somente de `@ssc0536/common`. Não use caminhos `src/`, `dist/`
  ou arquivos internos do pacote. A reorganização preserva os exports existentes.
- Testes de comportamento ficam em `test/<dominio>/`, espelhando os assuntos de `src/`.
  `test/exports.test.mjs` verifica a equivalência da API pública nos dois formatos.
- Código utilizado por apenas um app permanece nesse app. O common não concentra
  serviços, acesso a banco, componentes ou regras de negócio ainda não compartilhadas.

## Uso e verificação

Use tipos para checagem estática e validadores para dados recebidos em runtime.
DTOs Nest continuam no backend, com validação no servidor. Não exponha modelos Prisma
como contratos públicos. Não adicione dependências de React, Nest, Prisma ou APIs de
browser/Node ao código compartilhado; ele deve funcionar nos dois ambientes.

`pnpm install` compila este pacote pelo prepare da raiz. `pnpm dev` compila e acompanha
alterações no common e nos apps. O build recursivo respeita as dependências do workspace.
Para comandos individuais após editar contratos, rode `pnpm --filter @ssc0536/common build`.

`pnpm --filter @ssc0536/common test:unit` verifica os dois formatos publicados: ESM
para Vite e CommonJS para Nest. `dist` é gerado e não deve ser versionado.
