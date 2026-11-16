# Consultas de coleção no padrão OData — versão técnica 1

Toda listagem do sistema usa o mesmo conjunto de parâmetros de consulta, inspirado no
OData v4. É um **subconjunto próprio**, implementado em `@ssc0536/common` (`odata/`) e
reaproveitado pelo servidor (validação e conversão para Prisma) e pelo frontend (montagem do
filtro das grades). Não é um servidor OData completo e não expõe `$metadata`, `$select`,
`$expand` nem navegação entre entidades.

## Parâmetros

| Parâmetro  | Valor                     | Padrão                  | Limites                                                         |
| ---------- | ------------------------- | ----------------------- | --------------------------------------------------------------- |
| `$filter`  | expressão (ver gramática) | —                       | 2000 caracteres, profundidade 8, 50 nós, `in` com até 100 itens |
| `$orderby` | `campo [asc\|desc], ...`  | ordem padrão do recurso | até 3 campos, sem repetição                                     |
| `$top`     | inteiro de 0 a 100        | 20                      | —                                                               |
| `$skip`    | inteiro de 0 a 1 000 000  | 0                       | —                                                               |
| `$count`   | `true` ou `false`         | `false`                 | `true` inclui `meta.total`                                      |

Parâmetros iniciados por `$` fora desta tabela (`$select`, `$expand`, `$search`…) são
recusados com 400. Cada parâmetro pode aparecer uma única vez. Os campos aceitos em `$filter`
e `$orderby` são **somente as colunas devolvidas na linha** do recurso, listadas no esquema
do recurso (`common/src/odata/esquemas`): campos que o servidor não devolve nunca são
filtráveis, para que o filtro não funcione como oráculo de dados ocultos.

## Gramática de `$filter`

```text
expressao := ou
ou        := e ( "or" e )*
e         := nao ( "and" nao )*
nao       := "not" nao | primario
primario  := "(" expressao ")" | funcao | em | comparacao
funcao    := ("contains" | "startswith" | "endswith") "(" campo "," texto ")"
em        := campo "in" "(" literal ( "," literal )* ")"
comparacao:= campo ("eq" | "ne" | "gt" | "ge" | "lt" | "le") literal
campo     := identificador | "tolower" "(" identificador ")"
literal   := texto | inteiro | decimal | "true" | "false" | "null" | data | datahora
```

Operadores e funções são minúsculos. Precedência: `not`, depois comparações, `and`, `or`.

| Literal     | Forma                                | Exemplo                                |
| ----------- | ------------------------------------ | -------------------------------------- |
| texto       | entre aspas simples; `''` é uma aspa | `nomeFantasia eq 'Hotel D''Água'`      |
| inteiro     | dígitos com sinal opcional           | `totalUh ge 10`                        |
| decimal     | com ponto decimal                    | `valor gt 62.5`                        |
| booleano    | `true` ou `false`                    | `ativo eq true`                        |
| nulo        | `null`                               | `cnpj eq null`                         |
| data        | `AAAA-MM-DD`, sem aspas              | `vigenciaInicio ge 2026-10-01`         |
| data e hora | ISO 8601 com fuso, sem aspas         | `respondidaEm lt 2026-11-05T12:00:00Z` |

Regras de tipo (validadas contra o esquema): funções de texto e `tolower` só em campos de
texto; campos `enum` aceitam `eq`, `ne` e `in` com valores do domínio; booleanos aceitam
`eq` e `ne`; `null` só em campos que admitem nulo e apenas com `eq`/`ne`; inteiro é aceito em
campo decimal, mas não o contrário; data e data e hora não se misturam.

### Semântica

- Texto é **sensível a maiúsculas e minúsculas**, como no OData. Para comparar sem diferenciar,
  use `tolower(campo)` com o valor já em minúsculas (por exemplo `contains(tolower(nomeFantasia),'alfa')`).
- `ne` segue o SQL: **não retorna linhas com valor nulo**. Para incluí-las:
  `situacao ne 'ativo' or situacao eq null`.
- Comparações com `gt/ge/lt/le` descartam nulos.
- Curingas de `LIKE` (`%`, `_`) e aspas em `contains/startswith/endswith` são tratados como
  texto literal; nada é concatenado em SQL.
- Campos **virtuais** têm semântica própria descrita no esquema: `pendencia eq 'sem_cnpj'` em
  empreendimentos significa "tem essa informação faltante"; `identificacao` compara o CNPJ
  ou o ID. Campos virtuais podem não ser ordenáveis.

## Ordenação e paginação

- `$orderby` aceita colunas marcadas como ordenáveis. O servidor acrescenta sempre um
  desempate pela chave do recurso, então páginas consecutivas nunca repetem nem pulam linhas.
  Sem `$orderby`, vale a ordem padrão do recurso (definida no esquema).
- A resposta é `{ "data": [...], "meta": { "top": 20, "skip": 0, "total": 134 } }`; `total` só
  existe com `$count=true`. A página `n` (a partir de 1) é `skip = (n - 1) * top`.

## Erros

Entrada inválida retorna 400 com o envelope de negócio:

```json
{
  "error": {
    "code": "FILTRO_INVALIDO",
    "message": "Confira os parâmetros de consulta.",
    "details": [
      {
        "field": "$filter",
        "message": "Campo desconhecido: telefone.",
        "position": 0
      }
    ]
  }
}
```

`field` é o parâmetro com problema; `position` (opcional) é o índice do caractere no valor.
Parâmetros de paginação e ordenação inválidos usam o mesmo código.

## Autorização

O filtro do usuário é combinado com `AND` ao escopo de autorização do recurso (vínculo ativo,
visibilidade do perfil, empreendimento do contexto) e **nunca o substitui**. Um filtro que
mencione IDs fora do escopo apenas devolve vazio.

## Notas de implementação (servidor)

Comportamentos do Prisma tratados explicitamente e cobertos por testes de integração com um
oráculo em memória (o avaliador do `common` compara, para centenas de filtros, o resultado do
banco com o esperado):

- **Curingas do LIKE.** O Prisma não escapa `%` e `_` em `contains/startsWith/endsWith` nem na
  igualdade com `mode: 'insensitive'` (que vira `ILIKE`); o servidor escapa o valor, e
  `contains(nome,'_')` só encontra um sublinhado literal. A lista de `in` não usa `LIKE`.
- **Constantes lógicas.** `OR: []` e `{}` aninhados em `AND`/`OR` não são confiáveis; falso e
  verdadeiro são montados com `in: []` na chave do recurso e sua negação.
- **Negação.** `not` desce até as folhas (De Morgan) e cada folha negada exclui nulos de forma
  explícita; `ne`, `not in` e funções negadas nunca devolvem linhas com valor nulo.
- **`tolower`** compara em minúsculas no banco: um literal com maiúsculas nunca casa, e só `eq`,
  `ne`, `in` e as funções de texto são aceitos com ele. Letras acentuadas dependem da
  localidade do PostgreSQL (`lower`/`ILIKE`).
- **Campos virtuais** restringem seus operadores no esquema: `pendencia` aceita `eq`, `ne` e
  `in`; `identificacao` aceita `eq` e `contains` e compara o CNPJ (com ou sem máscara, quando
  completo) e o ID do sistema. Dígitos parciais não enxergam CNPJs gravados com máscara
  (legado); o cadastro novo grava só dígitos.
- **Ordenação.** Colunas opcionais ordenam com nulos por último e o desempate é sempre
  ascendente pela chave do recurso. Texto ordena pela _collation_ do banco; ordem relativa
  entre maiúsculas, acentos e pontuação não é garantida entre ambientes.

## Estado da migração

Todas as coleções existentes do backend já aceitam o padrão:

- contas, vínculos, permissões e visibilidades;
- empreendimentos e sua exportação, contatos, Cadastur, inventários e respostas;
- indicadores e sua exportação;
- eventos de auditoria (metadados; snapshots no detalhe autorizado).

`GET /segmentos` e `GET /perfis` permanecem catálogos simples de formulário. A ausência de
uma linha de visibilidade equivale a `permitido=false`; por isso essa coleção filtra, ordena e
pagina a projeção completa das definições de indicador, sem omitir os indicadores restritos.
O frontend usa `services/odata` como transporte das coleções. Todas as listagens do front são
grades (`DataTable`) com filtros por coluna, ordenação e paginação manuais, e a consulta persistida
na URL com chaves por grade (`<id>.filter`, `<id>.orderby`, `<id>.page`): empreendimentos,
contas, vínculos, permissões, visibilidades, contatos, Cadastur, inventários, respostas e
indicadores (`components/grade-colecao`). O seletor de contexto continua um seletor e consulta o
catálogo com `contains(tolower(nomeFantasia),...)` + `$top/$skip`. O editor de permissões lê a
matriz completa em consulta separada, paginando até o total, porque o `PUT` substitui tudo.

## Migração concluída

A paginação anterior (`page`, `pageSize`, `meta.page/pageSize/totalPages`) e os filtros ad hoc
(`busca`, `situacao`, `tipoHospedagem`, `incompleto`) foram removidos na Fase 6. Esta é a única
convenção de coleção: sem parâmetros, valem `$top=20`, `$skip=0` e **sem `total`** (peça
`$count=true`); qualquer parâmetro desconhecido, inclusive os antigos, retorna 400
`FILTRO_INVALIDO`.

## Exportações CSV

Rotas terminadas em `/exportacoes` usam o filtro e a ordenação da coleção, mas
retornam um arquivo CSV com todas as linhas autorizadas. Aceitam apenas `$filter`
e `$orderby`; parâmetros de paginação retornam 400. O contrato JSON de listagem
permanece paginado. Veja [exportações CSV](exportacoes.md).
