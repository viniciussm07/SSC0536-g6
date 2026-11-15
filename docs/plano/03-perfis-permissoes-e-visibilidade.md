# 03 — Perfis, vínculos e visibilidade de dados

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF21, RF36–RF38; RNF02 e RNF03.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [02](02-autenticacao-e-contas.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).

As fontes ajudam a identificar escopos e contatos; a matriz de permissões continua dependendo de decisão do OTO, não das colunas da planilha.

## Objetivo

Aplicar uma matriz de acesso aprovada pelo OTO em cada operação e consulta.

## Pré-condições específicas

Validar alçadas de administrador, gestor, estagiário, visualizador e empresário. A lista
existente no schema não define automaticamente suas permissões. Confirmar se uma pessoa
pode representar vários empreendimentos e se haverá dados de consulta pública.

## Backend e dados

- Definir recursos e ações da matriz: contas, vínculos, cadastro, inventário, pesquisa,
  resposta, importação, cálculo, consulta, publicação e auditoria.
- Implementar política centralizada e negação por padrão; obter a identidade da sessão.
- Filtrar consultas e escritas por `UsuarioEmpreendimento` ativo e por permissão.
  Não aceitar `usuarioId` enviado pelo cliente como prova de identidade.
- Garantir que IDs em URL/body e filtros, exports, agregações e rotinas de lote respeitem o escopo.
- Criar gestão de contas, perfis e vínculos com validação no servidor e integração com a parte 07.
- Evoluir o schema para visibilidade configurável por perfil/indicador: o texto `perfil`
  atual não representa sozinho o RF38. Revogação deve afetar sessões e caches pertinentes.

## Frontend

Gestão autorizada de contas/vínculos; navegação e ações por permissão; painel do empresário
com escolha explícita entre vínculos permitidos, se aplicável; visualizador sem edição.
Exibir estados de acesso negado e ausência de vínculos sem revelar dados de terceiros.

## Critérios de aceite e testes

- Empresário A não lê nem altera dados/respostas do empreendimento B por nenhum endpoint.
- Visualizador consulta apenas o conjunto liberado e não executa mutações.
- Vínculo ou conta desativados perdem acesso; mudanças administrativas ficam auditadas.
- Restringir uma informação também a remove de exportações e consultas usadas pelo BI.
- Indicadores agregados só são públicos após decisão explícita do OTO.
