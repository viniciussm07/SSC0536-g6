# 11 — Modelos de pesquisa, versões e reutilização

**Situação:** primeiro incremento implementado (modelo com campos e opções, versões
imutáveis por snapshot e histórico consultável); o dicionário oficial do formulário e o
vínculo edição↔versão (parte 12) permanecem pendentes.

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

## Registro da entrega (frente 2 — fatia F2-A)

- **Migration:** `20261122000000_periodos_identidade_e_modelos_versionados` cria
  `pesquisa_modelo_versao`/`pesquisa_campo_versao` (PK composta por modelo e número,
  `campoId` sem FK para preservar o histórico), `pesquisa_campo_opcao` e `versaoAtual` no
  modelo; `20261123000000_imutabilidade_versoes_modelo` impõe a imutabilidade dos
  snapshots por gatilho, como no catálogo.
- **Common:** contratos `ModeloPesquisaLinha/Detalhe`, `VersaoModeloLinha`, `CampoModelo`
  e `OpcaoCampo`; validadores (chaves estáveis, ordens únicas, opções exigidas só em
  `escolha`, motivos limitados) e guardas de resposta; esquemas OData `modelosPesquisa`
  e `versoesModelo`.
- **Backend:** módulo `pesquisas` — criação com snapshot da versão 1, alteração que
  sincroniza o conjunto de campos pela chave estável (adição, atualização e remoção),
  gera nova versão apenas em mudança semântica (rótulo, tipo, obrigatoriedade, opções,
  nome, público-alvo) com `motivo` registrado; alteração só de ordem não versiona;
  histórico em `GET /modelos-pesquisa/:id/versoes`; auditoria na mesma transação.
- **Frontend:** página Modelos de pesquisa com grade, editor dinâmico de campos e opções
  (TanStack Form) e diálogo de histórico de versões.
- **Verificação local:** common 176; backend unitário 51+6 e integração 71+5
  (incluindo preservação do snapshot da versão anterior e recusa de reescrita);
  frontend 153. Evidência técnica local, sem homologação nem GitHub Actions.

Pendências: dicionário oficial de perguntas, opções e unidades do OTO (o modelo canônico
de ocupação é fictício/demonstrativo, não homologado); a ligação entre a edição da pesquisa
(`Pesquisa`/`PesquisaPergunta`) e a versão do modelo será fechada na parte 12; a criação
livre de perguntas e tipos de campo (RF20) segue condicionada à validação de escopo.
