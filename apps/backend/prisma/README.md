# Modelo de dados OTO

O `schema.prisma` implementa as 26 tabelas do diagrama fornecido
(`mermaid-diagram-2026-11-09-201232 (1).png`). Os modelos usam PascalCase e os campos
camelCase no cliente; `@@map` e `@map` preservam os nomes em português e snake_case no banco.

## Correspondência com o diagrama

| Área        | Tabelas                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro    | `segmento`, `empreendimento`, `empreendimento_segmento`, `contato`, `cadastur`                                                                  |
| Acesso      | `usuario`, `usuario_empreendimento`                                                                                                             |
| Inventário  | `catalogo_grupo`, `catalogo_item`, `inventario_versao`, `inventario_item`                                                                       |
| Pesquisas   | `pesquisa_modelo`, `pesquisa_campo`, `pesquisa`, `pesquisa_pergunta`, `resposta`, `resposta_item`                                               |
| Operação    | `auditoria`, `periodo`, `coleta_diaria`                                                                                                         |
| Indicadores | `indicador_definicao`, `indicador_resultado`, `indicador_resultado_versao`, `parametro_calculo`, `indicador_resultado_parametro`, `rhc_periodo` |

## Decisões de implementação

- IDs simples são inteiros autoincrementais. As seis tabelas associativas preservam
  as chaves primárias compostas do desenho.
- Foram mantidas as unicidades de `chave` em segmento/grupo/item, de e-mail do usuário,
  de código do indicador e do par pesquisa/empreendimento em `resposta`.
- CNPJ é opcional e **não é único**, pois o diagrama condiciona essa regra à confirmação
  do OTO. O mapeamento de `tipo_hospedagem` para `categoria_indicador` continua aberto.
- Como a nulabilidade não é detalhada no desenho, ficam opcionais os dados cadastrais
  incompletos (razão social, CNPJ, ID antigo, endereço, categoria, localização e início
  das atividades), responsáveis de contato, número/vencimento de Cadastur, datas de fim,
  métricas e horários do inventário, detalhe/quantidade dos itens, fonte do parâmetro,
  snapshots de auditoria e os dois tipos de valor de resposta. IDs, vínculos e dados
  essenciais de cada entidade são obrigatórios. Valores desconhecidos não viram zero.
- `ativo` começa em `true` em usuários, vínculos e itens de catálogo. Os demais dados
  de negócio são informados explicitamente, inclusive datas de resposta e cálculo.
- Campos `text` com listas de valores no desenho permanecem `String`, com os valores
  documentados no schema, sem inventar enums ou restringir os catálogos extensíveis.
- `numeric` usa `Decimal`/`@db.Decimal` (precisão padrão do Prisma, 65 dígitos e 30 casas),
  `date` usa `@db.Date`, `time` usa `@db.Time(6)`, `timestamp` usa `@db.Timestamp(6)` e
  `jsonb` usa `Json`/`@db.JsonB`. A quantidade de dias do período é calculada pelas datas.
- As FKs têm índices e `onDelete: Restrict` para preservar histórico e auditoria.
  A exclusão de uma entidade referenciada exige tratar seus vínculos explicitamente.
- Regras entre pesquisas e campos do mesmo modelo, perguntas e respostas da mesma
  pesquisa, seleção exclusiva de catálogo, sobreposição de vigências e fórmulas dos
  indicadores não são definidas como constraints no diagrama. Devem ser validadas
  pelos serviços de domínio quando essas funcionalidades forem implementadas.

## PostGIS

`localizacao` mantém o tipo `geography` do diagrama como `Unsupported("geography")?`.
No Prisma 7, esse campo não aparece nas operações tipadas do cliente. Utilize SQL
parametrizado com funções PostGIS; por exemplo, para gravar um ponto WGS84:

```ts
await prisma.$executeRaw`
  UPDATE empreendimento
  SET localizacao = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
  WHERE id = ${empreendimentoId}
`;
```

Para leitura, converta o valor para um tipo suportado, como
`ST_AsGeoJSON(localizacao::geometry)::jsonb`. Os demais campos de empreendimento
continuam disponíveis normalmente no Prisma Client.

O Compose constrói PostgreSQL 17 com os pacotes PostGIS pelo
`scripts/postgres.Dockerfile`, mantendo a versão do banco e o diretório de dados do
setup anterior. A migration ativa `CREATE EXTENSION IF NOT EXISTS postgis`.
Em banco externo, instale PostGIS no servidor e execute a migration com um usuário
que possa criar a extensão, ou peça ao administrador para ativá-la previamente.
Referência: [extensões no Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-schema/postgresql-extensions).

## Aplicação das migrations

```sh
pnpm db:up
pnpm db:deploy
pnpm db:generate
```

O script global `bash scripts/start.sh` também reconstrói o banco com PostGIS e aplica
as migrations automaticamente. O histórico inicial foi preservado: a nova migration
`20261115000000_oto_domain` substitui a tabela de exemplo `User` pelo modelo do domínio.
Ela é transacional e **interrompe antes de qualquer mudança se `User` contiver dados**,
evitando descartar usuários existentes. Nesse caso é necessário planejar a conversão
dos IDs textuais e dos perfis antes de aplicar essa migration; não apague a tabela nem
execute reset para contornar a proteção. Nenhum banco existente é resetado pelos testes.

## Testes de integração

Depois de aplicar as migrations em um banco **exclusivo para testes**, cujo nome termine
em `_test`, execute na raiz:

```sh
DATABASE_TEST_URL=postgresql://app:app@localhost:5432/oto_test pnpm test
```

Sem `DATABASE_TEST_URL`, os testes HTTP normais continuam funcionando e a suíte do banco
é ignorada. As fixtures da suíte são executadas em transações revertidas ao final.
