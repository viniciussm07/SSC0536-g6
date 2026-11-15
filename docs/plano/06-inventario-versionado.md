# 06 — Inventário versionado, capacidade e atualização pelo empresário

**Situação:** primeiro incremento implementado (versões com vigência sem sobreposição, correção, estados por campo, conferência, histórico e diferenças); regras de negócio R06/R02 seguem como convenção técnica pendente do OTO; recálculo (parte 16) fora do recorte.

**Rastreabilidade:** RF01, RF08, RF21, RF23 e RF35; RNF09, RNF10 e RNF12.

**Dependências:** [03](03-perfis-permissoes-e-visibilidade.md), [04](04-cadastro-de-empreendimentos.md), [05](05-catalogos-e-formulario-de-inventario.md), [07](07-auditoria-de-alteracoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).

Conciliar capacidade do inventário com a referência MH da tabulação; não manter duas versões independentes de leitos/UH. Validar vigências e ajustes mínimo/máximo.

## Objetivo

Atualizar capacidade e infraestrutura mantendo a versão válida para cada período histórico.

## Regras a validar

Definir vigências (início/fim inclusivos ou exclusivos), correção versus mudança real,
tratamento de sobreposição, alterações retroativas e conferência completo/parcial/pendente.
Leitos, UH, capacidade máxima por UH e funcionários têm unidades e relações distintas;
a confirmação dos limites é responsabilidade do contrato de dados.

## Backend e dados

- Implementar criação, consulta da versão vigente e consulta da linha do tempo de
  `InventarioVersao` com seus `InventarioItem`.
- Registrar autor pela sessão, vigência e tipo de alteração; atualizar versões e auditoria
  na mesma transação. Usar controle de concorrência para evitar duas versões conflitantes.
- Validar quantidades, horários, seleções de catálogo e obrigatoriedade conforme situação.
- Resolver o efeito de correções sem apagar evidência anterior: versionar a correção ou
  registrar snapshot anterior auditável, conforme política aprovada.
- Expor capacidade válida na data/período, inclusive quando uma mudança ocorre no meio
  do intervalo; o uso desse caso nos indicadores depende da metodologia da parte 15.
- Ao mudar dados relevantes, registrar necessidade de recálculo; resultados publicados
  não devem ser substituídos silenciosamente (parte 16).

## Frontend

Formulário central, resumo da capacidade, histórico com vigências, diferenças entre versões,
seleção de tipo de alteração e fluxo de conferência para operadores autorizados.
Empresário usa a área autenticada; campos e ações obedecem à matriz de acesso.

## Critérios de aceite e testes

- Alterar leitos/UH mantém a versão anterior consultável e identifica usuário/data.
- Duas atualizações concorrentes não criam vigências conflitantes sem tratamento explícito.
- Não se aplica, desconhecido e zero mantêm significados definidos.
- Consulta histórica usa a capacidade daquele intervalo e não o último valor cadastrado.
- Empresário de outro empreendimento recebe negação de acesso.

## Conclusão do primeiro incremento

Demonstrar login → empreendimento permitido → edição do inventário → nova versão →
consulta do histórico e da auditoria. Usar uma amostra fictícia revisada e testes de autorização.

## Estado da implementação

Contrato, regras e pendências em [inventário versionado](../contratos/inventario.md).

- **Modelo:** `criada_em`, `motivo`, `estados` (JSONB) e `substituida_por_id` em
  `inventario_versao`; constraint de exclusão adiável (`btree_gist`) contra sobreposição de
  vigências não substituídas; checks de domínio; gatilhos que impedem reescrever o conteúdo de
  versões e itens. Migration `20261119000000_inventario_versionado`, sem drift.
- **Common:** planejamento puro de vigência (`planejarMudancaReal`, `planejarCorrecao`, fim
  inclusivo, datas civis), validação de entrada reaproveitando o normalizador de capacidade,
  regra de "completo", comparação de versões e guardas.
- **Backend:** criação de versão (mudança real e correção) com herança de campos e itens,
  validação do catálogo, retroatividade só para a equipe, serialização por empreendimento e
  auditoria atômica; vigente na data, detalhe e conferência; coleção OData com autor, tipo,
  data de registro e substituição.
- **Frontend:** na página do empreendimento, capacidade vigente, linha do tempo em grade (ações
  Ver detalhes, Corrigir e Conferir), detalhe com leitura histórica e diferenças; formulário de
  nova versão/correção com estados por campo e catálogo (seções compartilhadas com a
  pré-visualização).
- **Verificação local:** common 157; backend unitário 33+6 e integração 59+5 (PostgreSQL/PostGIS
  de teste, incluindo concorrência, fronteira de datas, correção, acesso cruzado, conferência e
  proteção do banco); frontend 114. Evidência técnica local, sem homologação nem GitHub Actions.

Pendências: aprovação do OTO para R06/R02, recálculo (parte 16), obrigatoriedade por contexto,
reconciliação com a referência MH da tabulação e trilha de auditoria consultável (parte 07).

## Infraestrutura antecipada (histórico)

`GET /empreendimentos/:id/inventarios` aceita o subconjunto OData comum, com filtro dentro
do escopo do vínculo/contexto e datas civis no contrato.
