# 14 — Notificações e preferências de boletim

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF29 e RF33; apoio a RF34; RNF03 e RNF14.

**Dependências:** [02](02-autenticacao-e-contas.md), [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md), [12](12-publicacao-prazos-e-respondentes.md), [13](13-respostas-e-painel-do-empresario.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).

Aceitar participar das pesquisas não equivale a optar por boletim. Os contatos do esqueleto não autorizam disparos nem definem um canal/provedor de notificação.

## Objetivo

Avisar sobre pesquisas abertas e registrar a preferência de recebimento dos resultados,
separando aviso operacional de adesão ao boletim.

## Decisões e dados necessários

- OTO define canal e mecanismo do aviso de abertura; não presumir integração WhatsApp/e-mail.
- Para RF29, registrar escolha de receber/não receber boletim e, quando positiva, canal
  preferido e contato válido (e-mail ou WhatsApp), com histórico de alteração quando necessário.
- Evoluir o schema: preferência, destinatário, tentativas e eventos de notificação não são
  representados por `Contato` ou `Resposta` de forma suficiente.
- Definir se preferência pertence à pessoa, ao empreendimento ou à participação em pesquisa,
  e como tratar vários representantes. Validar retenção e possibilidade de alteração da escolha.

## Backend e integração

- Registrar eventos após confirmação da abertura e envio por mecanismo aprovado; se houver
  envio automático, planejar fila/outbox, idempotência, retentativas limitadas e status de falha.
- Mensagens usam identidade institucional, link para a aplicação e escopo correto; não incluem
  credenciais, tokens de sessão ou indicadores restritos no corpo/URL.
- Registrar envio/erro sem confundir com leitura ou resposta à pesquisa. Falha externa não
  deve bloquear resposta autenticada nem duplicar mensagens indefinidamente.
- Distribuição de boletins usa apenas versões liberadas na parte 18 e público autorizado.

## Frontend

Preferência opcional e editável, confirmação do canal/contato, feedback claro sobre adesão;
painel operacional de avisos e falhas conforme o mecanismo aprovado.

## Critérios de aceite e testes

- Recusar boletim não impede envio da pesquisa; aceitar exige canal/contato válidos.
- Mudança de preferência afeta os próximos envios e não altera respostas de ocupação.
- Destinatários sem permissão não recebem conteúdo restrito.
- Reprocessar evento não duplica envio confirmado; falhas ficam visíveis para atuação.
- Sem definição de canal/provedor, registrar o bloqueio: um mock não representa entrega concluída.
