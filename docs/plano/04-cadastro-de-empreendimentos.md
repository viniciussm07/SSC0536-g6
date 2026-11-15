# 04 — Cadastro de empreendimentos, contatos e Cadastur

**Situação:** implementação técnica do cadastro entregue (API, auditoria e interface) com
dados fictícios; homologação do OTO pendente.

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

## Evidências locais e continuidade

Contrato, endpoints, regras e escopo estão em [contratos/cadastro](../contratos/cadastro.md).

**Entregue**

- API: listagem paginada com filtros (`busca` por nome ou CNPJ, `situacao`, `tipoHospedagem`,
  `incompleto`), detalhe, criação, atualização parcial e catálogo de segmentos. Sem migration:
  o MER já comporta os campos; a localização usa SQL parametrizado PostGIS (WGS84).
- Cadastro parcial sem CNPJ; contatos e Cadastur como conjunto desejado; encerramento por
  situação e data, sem exclusão (inventários e respostas anteriores preservados).
- Duplicidade por CNPJ, ID de origem ou nome normalizado, com confirmação explícita e
  registro na auditoria; homônimos não são fundidos nem bloqueados.
- Escopo: equipe cria e altera tudo; empresário altera só contato, endereço, Cadastur e
  similares do próprio vínculo (campos reservados retornam 403); autoria sempre da sessão.
- Auditoria na mesma transação, com antes/depois só dos campos alterados; edições
  concorrentes serializadas.
- Frontend: grade com filtro por coluna, ordenação e paginação OData, estado persistido na
  URL, ficha cadastral na página inicial do empreendimento, formulários de cadastro e edição
  (TanStack Form), aviso de duplicidade e erros por campo vindos do servidor.

**Verificações executadas localmente**

- `pnpm format:check`, `lint`, `typecheck`, `build`, `validate:repo` e `db:validate` aprovados.
- Unitários: 77 no common (ESM e CommonJS), 18 + 6 no backend e 74 no frontend.
- Integração em PostgreSQL/PostGIS isolado, sem testes ignorados: 11 testes novos do cadastro
  (criação parcial e completa, coordenadas PostGIS, validação, duplicidade, atualização
  parcial com auditoria, contatos/Cadastur, encerramento e reativação, escopo do empresário,
  estagiário e visualizador, concorrência e reversão atômica).
- Fluxo manual no navegador com a conta fictícia de gestor: cadastro, ficha, edição e
  auditoria conferidos; o registro de teste foi removido do banco de desenvolvimento.
- GitHub Actions ainda não executado para estas mudanças.

**Limites e pendências**

- Critérios de duplicidade, o que o empresário pode editar e a coerência do Cadastur são
  decisões técnicas da POC (R16–R18) e aguardam confirmação do OTO.
- Sem campo no MER para regularidade, bairro, região e proveniência (R07); tipo→categoria
  continua sem tabela aprovada (R08).
- Capacidade (UH e leitos) vem da parte 06; a tela de histórico e a consulta de auditoria,
  da parte 07; importação e conciliação entre fontes, das partes 08–09.
- A listagem pagina por nome; a busca por CNPJ compara o texto armazenado (14 dígitos ou
  mascarado) e não valida dígitos verificadores.

**Infraestrutura de consulta acrescentada:** a listagem e a exportação aceitam o subconjunto
OData comum; contatos e Cadastur também têm endpoints próprios paginados, filtráveis e
ordenáveis, com o mesmo `x-identification` e escopo do detalhe. A compatibilidade de
`page/pageSize` e dos filtros `busca`, `situacao`, `tipoHospedagem` e `incompleto` foi removida
na Fase 6; os equivalentes são `$filter` sobre `nomeFantasia`, `identificacao`, `situacao`,
`tipoHospedagem` e `pendencia`.

**Fase 4 da migração das grades (frontend)**

- `services/odata` centraliza os cinco parâmetros de coleção, encaminha cancelamento/contexto
  e valida `{ data, meta: { top, skip, total? } }` com a guarda publicada pelo common.
- `DataTable` registra os recursos manuais do TanStack Table v9, oferece cabeçalho ordenável,
  filtro por coluna em popover/TanStack Form, chips removíveis, filtro personalizado e
  paginação pelo total do servidor. Todas as colunas de dados do piloto apontam para campo
  filtrável de `ESQUEMA_EMPREENDIMENTOS`; a coluna de ações é isenta.
- A rota valida e o hook sincroniza `empreendimentos.filter`, `.orderby` e `.page`; parâmetros
  inválidos são descartados e recarregar a URL restaura a consulta. A query key inclui a
  consulta OData completa.
- A listagem de empreendimentos deixou de usar o formulário de filtros ad hoc. Os demais
  consumidores de `services/acesso` já trafegam OData, com adaptação temporária dos metadados
  para suas interfaces antigas até a fase 5.
- Verificação automatizada desta fase: common com 115 testes e frontend com 86 testes,
  incluindo cobertura das colunas, URL, filtro, ordenação, paginação, erro e vazio. Isso é
  evidência técnica local, não homologação do OTO.
- Conferência no navegador com a conta fictícia de gestor: filtro por nome, ordenação e
  restauração após recarregar a URL aprovados; layout estreito mantém rolagem horizontal da
  grade. Paginação exercitada nos testes com mais de uma página. Stack local reconstruída.
- Fechamento: hook de URL independente da rota piloto, páginas limitadas ao `$skip` aceito
  pelo servidor e acréscimo de condição por coluna preservando filtros personalizados.

**Fases 5 e 6 da migração das grades**

- Fase 5: contas, vínculos, permissões, visibilidades, contatos, Cadastur, inventários, respostas
  e indicadores são grades (`components/grade-colecao` + `colunas.tsx` por página) com filtro por
  coluna, ordenação e paginação do servidor e estado na URL por grade (`<id>.filter`,
  `<id>.orderby`, `<id>.page`). O seletor de contexto continua um seletor e consulta o catálogo
  por `$filter`/`$top`/`$skip`. O editor de permissões lê a matriz completa em consulta separada,
  paginando até o total. Teste de cobertura: toda coluna de dados de toda grade é filtrável.
- A página de administração foi reorganizada em abas (Contas; Permissões e visibilidade), com
  diálogos para nova conta, gerenciar conta (perfil, situação, novo código e vínculos) e alterar
  permissão. Conferida no navegador com a conta fictícia de administrador.
- Fase 6: removidos `PaginaDto`, `ListaEmpreendimentosDto`, `paginacao()`/`colecao()`, o modo
  legado do decorator de coleção, `isPaginatedResponse`/`PAGINATION` do common e o componente
  `Paginacao`. Parâmetros fora do padrão OData (inclusive `page`/`pageSize`) retornam 400;
  sem parâmetros valem `$top=20`, `$skip=0` e sem `total`.
- Verificação local: common 115, backend unitário 31+6 e integração 36+5 (PostgreSQL/PostGIS de
  teste), frontend com testes das grades e da administração. Evidência técnica local; os
  resultados do GitHub Actions ainda não foram executados e isto não é homologação do OTO.

## Atualização visual

A interface existente recebeu o [tema OTO e a navegação responsiva](interface-visual.md),
preservando os contratos e limites desta parte. Evidências e pendências estão no registro
da entrega visual; esta atualização não representa homologação de negócio.
