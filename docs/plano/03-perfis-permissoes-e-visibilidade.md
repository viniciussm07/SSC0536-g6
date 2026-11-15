# 03 — Perfis, vínculos e visibilidade de dados

**Situação:** implementação técnica da matriz de acesso da POC entregue; homologação
pela OTO pendente.

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

## Decisões da POC e evidências locais

- Matriz confirmada pelo desenvolvedor para a POC (detalhes em
  [contratos/acesso](../contratos/acesso.md)); alçadas, múltiplos vínculos e ausência
  de acesso público **não foram homologados pelo OTO**.
- Múltiplos vínculos por pessoa, com seleção explícita; todos os dados exigem autenticação.
- Política central com negação por padrão, visibilidade de indicadores por perfil e
  filtros por vínculo ativo em consultas e exportações; migration `20261117000000_permissoes`.
- `pnpm typecheck`, `format:check`, `lint`, `validate:repo`, `build` e `db:validate` aprovados.
- Unitários: 47 no common, 14 no backend e 24 no frontend aprovados.
- Integração em PostgreSQL/PostGIS isolado (`oto_acesso_test`): isolamento entre
  empresários, revogação de sessões e indicadores restritos fora de consultas e
  exportações; 0 ignorados. Resultados de GitHub Actions não verificados.
- Pendências: escrita cadastral, inventário e respostas (planos 04–13) usarão a política
  central; integração com auditoria (parte 07) ainda não existe.
- Contas fictícias de teste para os cinco perfis (e dois empresários) no seed, com
  visibilidade do indicador de demonstração para gestor e visualizador; ver
  [fixtures/oto](../../fixtures/oto/README.md#contas-de-demonstração-por-perfil).
- Contexto de entidade: dados de empreendimento exigem o cabeçalho `x-identification`;
  admin/gestor/estagiário começam na visão geral e escolhem a entidade (com busca),
  empresário sempre opera em um dos próprios vínculos. Regras e códigos de erro em
  [contratos/acesso](../contratos/acesso.md#contexto-de-entidade-x-identification).
  Pendente: área "Minha conta".
- As coleções de contas, vínculos, permissões e visibilidades aceitam `$filter`, `$orderby`,
  `$top`, `$skip` e `$count`; `page/pageSize` e os metadados antigos foram removidos (a Fase 6
  rejeita esses parâmetros com 400). Filtros de visibilidade preservam
  a regra de que configuração ausente significa `permitido=false`.
- A Fase 3 da migração OData foi verificada em `oto_odata_test`: 36 testes HTTP/PostgreSQL
  mais 5 testes da carga fictícia, sem ignorados, incluindo filtros em todas as coleções,
  contatos/Cadastur e tentativa de acesso de empresário a ID fora do vínculo.

## Atualização visual

A interface existente recebeu o [tema OTO e a navegação responsiva](interface-visual.md),
preservando os contratos e limites desta parte. Evidências e pendências estão no registro
da entrega visual; esta atualização não representa homologação de negócio.
