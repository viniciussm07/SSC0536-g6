# 04 — Cadastro de empreendimentos, contatos e Cadastur

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF01, RF07 e RF23; RNF01 e RNF09.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).

Priorizar a aba MEIOS DE HOSPEDAGEM e seus campos de contato/Cadastur. Regularidade, situação ativa/encerrada e possuir Cadastur são conceitos diferentes.

## Objetivo

Entregar cadastro central de meios de hospedagem com consulta, atualização e identificação estável.

## Backend e dados

- Implementar operações de listagem paginada, detalhe, criação e atualização de
  `Empreendimento`, vínculos `EmpreendimentoSegmento`, `Contato` e `Cadastur`.
- Aplicar o contrato canônico e resolver duplicidades potenciais antes de criar registros.
  CNPJ segue opcional e sem restrição única até confirmação formal.
- Separar nome fantasia/razão social, identificação da origem, tipo de hospedagem e
  categoria de indicador; não inferir categoria silenciosamente.
- Validar contatos públicos/internos, regras do número de Cadastur conforme situação,
  data de encerramento e manutenção do histórico. Preferir inativação a exclusão referenciada.
- Tratar geolocalização opcional por SQL parametrizado PostGIS, validar coordenadas e
  documentar longitude/latitude. Cadastro não depende de mapa ou geocodificação automática.
- Salvar alterações e auditoria atomicamente. Capacidade pertence às versões de inventário,
  não a cópias de leitos/UH mantidas manualmente no cadastro.

## Frontend

Lista com filtros e estados sem dados; detalhe; formulário de cadastro/edição;
contatos e Cadastur; indicação de situação cadastral e informações faltantes.
Respeitar escopo do usuário e sinalizar possível duplicidade para resolução autorizada.

## Critérios de aceite e testes

- Operador autorizado cadastra, consulta e atualiza um meio de hospedagem completo ou parcial.
- Registro sem CNPJ é aceito conforme contrato; homônimos não são automaticamente fundidos.
- Empresário só altera seus vínculos permitidos; contatos internos não aparecem em visão pública.
- Encerramento não remove respostas nem inventários passados.
- Alterações identificam autor e campos modificados na auditoria.

## Entrega demonstrável

Um estabelecimento fictício de amostra percorre cadastro, consulta e atualização; capacidade
é integrada pela parte 06. Este é o núcleo da primeira demonstração funcional.
