# Catálogos e formulário canônico de inventário

Implementação técnica da [parte 05](../plano/05-catalogos-e-formulario-de-inventario.md).
Os catálogos descrevem as perguntas e opções do inventário de hospedagem; o inventário com
vigência e histórico (gravar respostas) é a parte 06. Regras abaixo são técnicas, **não
homologadas pelo OTO**.

## Modelo

- `Segmento` → `CatalogoGrupo` (uma pergunta) → `CatalogoItem` (uma opção).
- Grupo: `chave` estável e única, `pergunta`, `selecao` (`unica` ou `multipla`),
  `permiteOutro`, `secao` (agrupamento na tela), `ordem`, `ativo`.
- Item: `chave` estável e única, `rotulo`, `exclusivo`, `outro`, `aceitaQuantidade`,
  `ordem`, `ativo`, `versaoAtual`.
- `CatalogoItemVersao`: snapshot **imutável** (gatilho no banco bloqueia UPDATE/DELETE) de
  rótulo, pergunta e seleção do grupo e das regras do item. `InventarioItem` referencia
  `(item, versão)` por chave estrangeira composta, então editar o catálogo não muda a leitura
  de inventários anteriores.
- Itens e grupos são **inativados, nunca removidos**. Inativos não aceitam novas respostas,
  mas continuam legíveis.

## Regras de seleção (validação compartilhada)

`validarRespostasCatalogo` (common) é a única implementação, usada pela API e reservada à
entrada do inventário e à importação. Resposta de item: `{ itemId, estado, detalhe?, quantidade? }`
com `estado` em `sim`, `nao`, `nao_se_aplica`, `nao_informado`.

- Item desconhecido, repetido ou com estado inválido é recusado; campos extras também.
- Item ou grupo inativo recusa novas respostas (`somenteAtivos`, padrão).
- Grupo de seleção única admite no máximo um `sim`.
- Item **exclusivo** (ex.: "Não possui") marcado `sim` não combina com outro `sim` do grupo.
- Item "outro" com `sim` exige `detalhe`; `detalhe` só existe em itens "outro" e com `sim`.
- `quantidade` (inteiro ≥ 0) só existe em itens que a aceitam e com `sim`.
- Item sem resposta continua **desconhecido**: nada é convertido em "não". Zero, não se
  aplica e desconhecido são respostas diferentes.
- Na criação/alteração de itens: exclusivo não pode ser "outro" nem aceitar quantidade, e
  "outro" exige grupo com `permiteOutro`.

## Endpoints (sob `/api`)

| Método e caminho                             | Permissão               | Descrição                                                                                               |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| GET `/segmentos/:id/catalogo`                | `inventarios:consultar` | Formulário ativo `{ segmentoId, grupos[{...itens[]}] }`. `?incluirInativos=true` exige `catalogos`.     |
| POST `/segmentos/:id/catalogo/validacoes`    | `inventarios:criar`     | `{ itens }` → `{ itens }` normalizados ou 400 `ENTRADA_INVALIDA` com `itens[i].campo`/`grupos.<chave>`. |
| GET `/catalogos/grupos` e `/catalogos/itens` | `catalogos:consultar`   | Coleções OData (`catalogoGrupos`, `catalogoItens`).                                                     |
| GET `/catalogos/itens/:id/versoes`           | `catalogos:consultar`   | Coleção OData do histórico imutável do item.                                                            |
| POST `/catalogos/grupos`, `/catalogos/itens` | `catalogos:criar`       | Cria (201). Chave repetida → 409 `CHAVE_DUPLICADA`. Item nasce na versão 1.                             |
| PUT `/catalogos/grupos/:id`                  | `catalogos:alterar`     | `pergunta`, `secao`, `ordem`, `ativo`, `motivo`. Mudar a pergunta versiona todos os itens do grupo.     |
| PUT `/catalogos/itens/:id`                   | `catalogos:alterar`     | `rotulo`, `exclusivo`, `outro`, `aceitaQuantidade`, `ordem`, `ativo`, `motivo`.                         |

Chave, `selecao` e `permiteOutro` do grupo são imutáveis. Alterar rótulo ou regra de item
cria a próxima versão; ordem e situação não. Sem mudança real, nada é versionado nem auditado.
Toda mutação grava `Auditoria` (`catalogo_grupo` / `catalogo_item`) na mesma transação, com a
autoria da sessão. `catalogos` é recurso **exclusivo do administrador** (consultar, criar e
alterar, escopo `todos`).

## Carga inicial (dicionário técnico v1)

`pnpm db:catalogos` (idempotente, não destrutivo) cria o segmento `hospedagem`, 26 grupos e
160 itens a partir dos cabeçalhos AZ:HC da aba `MEIOS DE HOSPEDAGEM ` do inventário, conforme o
[dicionário](dicionario-inventario.md): uma opção por coluna, sem inventar opções. Nunca altera
registros existentes, inclusive edições da gestão. A carga não grava auditoria (não há usuário
autenticado); a proveniência fica no `motivo` da versão 1.

Pendências para o OTO:

- **AX Reservas** e **AY Formas de pagamento** não têm opções no cabeçalho: ficaram de fora.
- Rótulos seguem a planilha, inclusive grafias a revisar ("Anfiteratro", "Obtáculos").
- Legenda, obrigatoriedade por contexto e dependências (ex.: PCD "Sim" habilitar as perguntas
  seguintes) não foram definidas.
- Quantidade por item: nenhum cabeçalho a exige; `aceitaQuantidade` começa falso.
- Itens "Sim"/"Não" de perguntas binárias são grupos de escolha única.
