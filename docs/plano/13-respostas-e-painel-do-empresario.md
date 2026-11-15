# 13 — Resposta de pesquisa e painel do empresário

**Situação:** planejado; não implementado por este documento.

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
