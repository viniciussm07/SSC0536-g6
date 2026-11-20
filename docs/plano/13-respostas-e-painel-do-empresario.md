# 13 — Resposta de pesquisa e painel do empresário

**Situação:** primeiro incremento implementado: painel do empreendimento, formulário
curto e envio idempotente com correção dentro do prazo. A política de correção e as
regras de valor são propostas técnicas pendentes de confirmação do OTO; não há homologação.

**Rastreabilidade:** RF02, RF26–RF28 e RF30–RF32; RNF01, RNF08 e RNF11.

**Dependências:** [03](03-perfis-permissoes-e-visibilidade.md), [06](06-inventario-versionado.md), [07](07-auditoria-de-alteracoes.md), [12](12-publicacao-prazos-e-respondentes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).

Usar as tabulações para definir o destino das respostas. Perguntas, opções e obrigatoriedade precisam de formulário/dicionário aprovado; testar com empresas e usuários fictícios.

## Objetivo

Permitir resposta curta, autenticada e vinculada automaticamente ao empreendimento e à edição correta.

## Backend e dados

- Expor pesquisas elegíveis, pendências, histórico e detalhe do formulário no escopo do empresário.
- Implementar gravação de `Resposta`/`RespostaItem` obtendo usuário da sessão e validando
  o empreendimento pelo vínculo ativo. Não exigir digitar novamente o nome da hospedagem.
- Validar percentual e unidade aprovados, obrigatoriedade, tipos e opções contra a versão
  do formulário; pergunta e resposta devem pertencer à mesma pesquisa.
- Preservar a unicidade pesquisa/empreendimento. Definir se há rascunho, substituição,
  correção após envio e qual representante pode fazê-la; essas políticas não estão resolvidas
  pela chave única atual e podem exigir versão/histórico adicional.
- Gravar itens e auditoria atomicamente, verificar prazo no servidor e tratar reenvio/rede
  sem duplicar resposta. Não aceitar resposta apenas porque o formulário ficou aberto no navegador.
- Incorporar resposta válida à base de cálculo automaticamente e registrar processamento
  pendente para a parte 16; o envio não depende de transcrição manual ou cálculo síncrono longo.
- Integrar a preferência de boletim da parte 14 sem condicionar participação ao recebimento de mensagens.

## Frontend

Painel do empreendimento com pesquisas abertas, indicação Expectativa/Consolidado e período,
formulário curto, validação contextual, confirmação inequívoca e consulta do que foi enviado.
Tratar múltiplos vínculos, duplicidade, prazo vencido, perda de conexão e sessão expirada.

## Critérios de aceite e testes

- Resposta corresponde ao usuário/empreendimento permitido e não pode ser forjada trocando IDs.
- Pergunta de outra pesquisa, percentual inválido e envio fora do prazo são rejeitados.
- Duplo clique ou reenvio não cria respostas/itens duplicados.
- Formulário preenchido com dados válidos pode ser respondido em tela pequena e por teclado.
- Referência de preenchimento rápido é medida com usuários; meta de tempo é validada com OTO,
  sem tratar automaticamente o tempo do fluxo legado como um SLA aprovado.
- Resposta aparece na lista de respondentes e fica disponível para cálculo sem edição em planilha.

## Infraestrutura antecipada

`GET /empreendimentos/:id/respostas` aceita o subconjunto OData comum, com filtro combinado ao
vínculo e ao contexto. Isso não implementa elegibilidade, formulário, envio ou correção de
respostas; esses fluxos e suas decisões de negócio permanecem planejados nesta parte.

## Registro da entrega (primeiro incremento)

- **Migration** `20261125000000_respostas_pesquisa`:
  - `resposta.atualizada_em` registra a última correção; `respondida_em` guarda o
    primeiro envio;
  - `CHECK`s `NOT VALID` (`atualizada_em >= respondida_em` e exatamente um valor por
    `resposta_item`). Valem para novas gravações sem
    reinterpretar linhas legadas.
- **Common** (`pesquisas/resposta.*`): contratos do painel, do formulário e do envio;
  `validarEnvioResposta()` (whitelist, `perguntaId` único, valor como texto) e
  `conferirItensResposta()`:
  - percentual de 0 a 100 pelo normalizador do contrato de dados (vírgula ou ponto);
  - escolha pela chave de uma opção da versão congelada;
  - texto aparado; vazio equivale a não responder;
  - obrigatórias exigem valor; pergunta de outra edição é rejeitada.
    As mesmas funções validam no formulário e no servidor. Esquema OData
    `pesquisasRespondente`.
- **Backend** (`RespostasPesquisaService`), sempre no escopo do empreendimento
  contextualizado (vínculo ativo + cabeçalho de contexto; sem vínculo, 404):
  - `GET /empreendimentos/:id/pesquisas`: coleção OData das edições publicadas cujo
    público congelado inclui o empreendimento, com `situacaoResposta` e `respondidaEm`
    virtuais;
  - `GET /empreendimentos/:id/pesquisas/:pesquisaId`: formulário com tipo,
    obrigatoriedade e opções da versão do modelo, períodos, situação no relógio do
    servidor e resposta registrada;
  - `PUT /empreendimentos/:id/pesquisas/:pesquisaId/resposta`: 201 ao criar, 200 ao
    corrigir ou reenviar. O mesmo conteúdo reenviado (duplo clique, nova tentativa após
    falha de rede) não grava nem audita de novo. Autoria vem da sessão; envios do
    mesmo empreendimento à mesma edição são serializados por trava consultiva, e
    `exigirRecebimento()` serializa com o encerramento. Itens e auditoria (`criar`/
    `alterar`, com antes e depois) ficam na mesma transação.
- **Frontend:**
  - seção Pesquisas na página do empreendimento, com situação da resposta e ação
    Responder/Ver resposta;
  - página `/responder/:pesquisaId` com perguntas agrupadas por período, campos
    acessíveis por teclado e validação antes do envio;
  - confirmação explícita com data e hora; erros por campo e de prazo sem perder o
    preenchimento; somente leitura fora da janela de recebimento.
  - Os rótulos de pesquisa passaram para `utils/pesquisa.ts`, compartilhado com a gestão
    de edições.
- **Verificação local:**
  - Common: 249 testes.
  - Backend: 52 + 6 unitários; integração sequencial (`pnpm test:integration`) com
    79 + 5, incluindo `respostas.integration.test.ts` (escopo e contexto, validação,
    idempotência e duplo clique simultâneo, correção auditada, prazo vencido e
    encerramento).
  - Frontend: testes do painel e do formulário; lint, typecheck e build passaram.
  - Evidência técnica local, sem GitHub Actions nem homologação.

## Correções de revisão técnica

- O recebimento lê o relógio após obter a trava compartilhada da edição e usa o
  mesmo instante na decisão de prazo e nos timestamps da resposta. O reenvio igual
  continua sujeito à janela e não gera nova auditoria.
- A escrita exige consulta e, conforme a existência da resposta, criação ou alteração;
  a tela usa a permissão correspondente e restringe a leitura quando ela falta.
  Ao trocar usuário, revisão da política, empreendimento ou pesquisa, o formulário
  é recriado com os valores do contexto selecionado.
- A grade de respostas oferece acesso ao detalhe de respostas existentes mesmo quando
  não há destinatário registrado para a edição.
- O corpo JSON do PUT de resposta tem limite de 32 MiB, suficiente para representar
  2.400 valores de até 2.000 unidades UTF-16 mesmo escapados em JSON; as demais rotas
  mantêm o limite padrão do Nest. O Caddy versionado não define limite adicional.
- Testes locais cobrem espera por trava cruzando o prazo no PostgreSQL, permissões,
  resposta legada, troca de empreendimento com cache e corpo maior que 100 KiB.
  Não há homologação de regras de negócio nem teste de infraestrutura externa.

Pendências (dependem do OTO ou de outras partes):

- **Política de correção (proposta):** qualquer representante vinculado pode corrigir
  enquanto a edição recebe respostas; a resposta substitui o conjunto de itens e o
  histórico fica na auditoria. Não há rascunho salvo nem correção após o prazo.
- **Estados especiais:** “desconhecido” e “não se aplica” ainda não são aceitos nas
  respostas de pesquisa; a admissibilidade por campo depende do dicionário do OTO.
- **Dicionário de dados:** as chaves dos campos continuam texto livre (parte 11).
  Unidade e escala vêm só do tipo `percentual`.
- **Edições legadas** sem público registrado não aparecem no painel nem aceitam envio
  pela plataforma.
- **Cálculo (parte 16):** a resposta fica disponível no banco para cálculo; não há fila
  de processamento pendente nesta entrega.
- **Preferência de boletim (parte 14):** não integrada; a participação não depende de
  mensagens.
- **Tempo de preenchimento:** a meta de tempo não foi medida com usuários.
