# 11 — Modelos de pesquisa, versões e reutilização

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF20 e RF25; RNF07 e RNF12.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).

Há edições legadas que combinam Consolidado e Expectativa; decidir como separá-las ou evoluir o MER, que possui um único tipoColeta por pesquisa. A tabulação não substitui o dicionário do formulário.

## Objetivo

Reutilizar a estrutura aprovada de pesquisas sem modificar perguntas de edições históricas.

## Backend e dados

- Implementar gestão de `PesquisaModelo` e `PesquisaCampo` com chave estável, rótulo,
  tipo de valor, obrigatoriedade e ordem. Começar pelo modelo canônico de ocupação.
- Modelar opções de campos de escolha, validações e unidades: o schema atual não possui
  catálogo de opções de pesquisa nem um mecanismo completo de versionamento do formulário.
- Definir versões imutáveis ou snapshots dos campos usados em cada edição. Alterar o
  modelo futuro não pode reinterpretar uma resposta já recebida.
- Separar edição de rascunho, criação de nova versão e reutilização em nova pesquisa.
- Duplicar a estrutura preservando chaves, ordem e interpretação, substituindo a referência
  temporal explicitamente; criar novos IDs de perguntas sem copiar respostas anteriores.
- Validar compatibilidade do campo com o modelo escolhido; não aceitar relações inconsistentes
  apenas porque as FKs individuais existem.

## Frontend

Tela para consultar o modelo, revisar campos e preparar nova edição; comparação de versões
quando necessário. Um formulário de configuração orientado ao modelo aprovado é suficiente
na primeira entrega; um construtor genérico visual não é pré-requisito da POC.

## Critérios de aceite e testes

- Nova edição reaproveita a estrutura e troca o período sem carregar respostas antigas.
- Edição futura de rótulo, opção ou obrigatoriedade não altera a leitura da edição anterior.
- Não é possível misturar campos de modelos incompatíveis.
- Operadores sem permissão não alteram modelos; alterações autorizadas são auditadas.

## Entregáveis

Modelo inicial validado, estratégia de versão e migrations correspondentes, contratos de
API, interface de reutilização e testes de preservação histórica.
