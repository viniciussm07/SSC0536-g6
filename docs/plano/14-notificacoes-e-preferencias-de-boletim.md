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

- **Decisão do projeto:** o aviso de abertura de pesquisa será enviado por **e-mail**,
  usando o serviço transacional [Resend](https://resend.com). WhatsApp não faz parte
  desse aviso e segue sem integração definida. A confirmação da OTO sobre o provedor
  continua pendente; até lá, a decisão vale para o desenho e a implementação do projeto.
- Pré-requisitos do Resend: domínio (ou subdomínio) de envio verificado com SPF e DKIM,
  DMARC recomendado, remetente institucional e chave de API guardada como segredo
  (`RESEND_API_KEY`) na configuração de produção, fora do Git, dos logs e das fixtures.
- Cota a respeitar: o plano gratuito informado pelo provedor permite 100 e-mails por dia
  UTC e 3.000 por mês; o plano pago remove o limite diário. Confirmar os valores vigentes
  em <https://resend.com/pricing> antes de dimensionar. Aberturas com mais destinatários
  que a cota diária dependem da fila com retentativa abaixo.
- Destinatários do aviso: e-mails dos usuários com vínculo ativo ao empreendimento elegível
  (`Usuario.email`); `Contato` do tipo e-mail só entra se a OTO autorizar esse uso.
- Para RF29, registrar escolha de receber/não receber boletim e, quando positiva, canal
  preferido e contato válido (e-mail ou WhatsApp), com histórico de alteração quando necessário.
- Evoluir o schema: preferência, destinatário, tentativas e eventos de notificação não são
  representados por `Contato` ou `Resposta` de forma suficiente.
- Definir se preferência pertence à pessoa, ao empreendimento ou à participação em pesquisa,
  e como tratar vários representantes. Validar retenção e possibilidade de alteração da escolha.

## Backend e integração

- Registrar eventos após confirmação da abertura e envio por mecanismo aprovado; se houver
  envio automático, planejar fila/outbox, idempotência, retentativas limitadas e status de falha.
- Isolar o Resend atrás de uma interface de envio no backend, para trocar de provedor e
  testar sem rede. Chamar a API somente a partir de um worker/outbox, nunca dentro da
  transação de abertura nem da requisição do usuário.
- Usar chave de idempotência por evento e destinatário na chamada ao Resend e respeitar
  seus limites de taxa e a cota diária: ao atingi-los, manter o envio pendente e retomar
  depois, sem marcar como enviado. Registrar o identificador devolvido pelo provedor.
- Se for usar webhooks do Resend (entregue, devolvido, spam), validar a assinatura da
  requisição e tratar o evento como estado de entrega, não como leitura ou resposta.
- O Resend é operador externo: o e-mail do destinatário e o texto saem da VPS. Informar
  isso na política de privacidade e enviar apenas o necessário.
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
- Testes automatizados usam um provedor de envio simulado, sem rede nem chave real; um
  mock não representa entrega concluída nem substitui a verificação com o Resend.
- Abertura com mais destinatários que a cota diária não perde nem duplica avisos: o excedente
  fica pendente e é enviado depois.
- Falha ou indisponibilidade do Resend não bloqueia a abertura da pesquisa nem a resposta
  autenticada; fica registrada para atuação.
- Sem a chave de API ou o domínio verificado em um ambiente, registrar o bloqueio e não
  declarar o aviso como entregue.
