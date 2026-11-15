# 07 — Auditoria transacional e consulta de alterações

**Situação:** incremento técnico implementado e verificado localmente; homologação e política de retenção do OTO pendentes.

**Rastreabilidade:** RF39; RNF03 e RNF10.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [02](02-autenticacao-e-contas.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

Os hashes e locais de origem documentados nos READMEs servem à proveniência. Planilhas não fornecem identidades autenticadas nem substituem uma trilha de alterações.

## Objetivo

Tornar cada mutação de negócio atribuível a uma identidade e permitir investigação de alterações.

## Backend e dados

- Definir serviço de auditoria sobre `Auditoria` com usuário, entidade/ID, ação,
  valores anteriores/posteriores e instante; autor e horário são determinados no servidor.
- Integrar auditoria à mesma transação de cadastros, vínculos, inventários, pesquisas,
  respostas, importações e decisões de publicação. Falha em gravar auditoria reverte a mutação.
- Planejar identidade e origem para processos automáticos/importações e correlação por lote
  ou operação; não atribuir uma automação a um usuário arbitrário nem forjar ação humana.
- Diferenciar log operacional e trilha de negócio. Excluir senhas, tokens, segredos e
  dados sem necessidade dos snapshots; definir acesso e retenção com o OTO.
- Proteger a trilha de alteração/exclusão pelos fluxos comuns. Definir permissões do usuário
  de aplicação para evitar mutações diretas desnecessárias na trilha.

## API e interface

Listagem paginada e filtros por entidade, período, autor e ação; detalhe com diferenças
antes/depois. Guardar contexto suficiente para leitura mesmo após inativação da entidade.
A consulta fica limitada ao público autorizado na parte 03.

## Critérios de aceite e testes

- Toda operação crítica prevista em cada módulo possui evidência auditável.
- Exceção no meio de uma transação não deixa dado alterado sem registro correspondente.
- Autor informado no corpo da requisição não substitui a identidade autenticada.
- Usuários comuns não editam/removem eventos e segredos não aparecem na consulta.
- Importação e processamento automático são distinguíveis de alterações manuais.

## Dependência transversal

O mecanismo básico nasce com a autenticação. Cada funcionalidade deve integrar sua própria
trilha antes de ser considerada pronta; a auditoria não é uma tarefa adiada para o final.

## Estado da implementação

Contrato e limites em [auditoria de alterações](../contratos/auditoria.md).

- **Common:** contratos de resumo/detalhe e proveniência, validação de JSON e comparação
  que distingue ausência, null, zero e false. `ESQUEMA_AUDITORIAS` publica as colunas da
  coleção, seus filtros e a ordenação estável.
- **Gravação:** helper transacional único usado por contas, vínculos, políticas, cadastro,
  catálogos, inventário e autenticação. Abertura/encerramento de sessão e definição de
  senha registram apenas códigos de evento. Novas versões de inventário registram
  capacidade e referências/estados dos itens, preservando as anteriores.
- **Dados:** migration `20261120000000_auditoria_consultavel` acrescenta origem, processo,
  correlação e nome do autor. Mantém IDs, snapshots e datas. Registros legados recebem
  o nome conhecido na migração; nomes históricos nunca armazenados não são inventados.
  Os marcadores sintéticos são identificados como processo automático `db:seed`.
- **Proteção:** triggers bloqueiam UPDATE/DELETE/TRUNCATE; autoria/processo têm constraint.
  Lista positiva de campos e remoção recursiva de segredos são aplicadas na escrita e na
  leitura legada. Papéis de execução/migration e limites do proprietário do banco estão
  definidos no contrato; o Compose local usa o proprietário, não prova isolamento de produção.
- **API:** `GET /api/auditorias` e `GET /api/auditorias/:id`, somente administrador com
  permissão de consulta global, sem bypass de perfil. Filtros OData por entidade/registro,
  período, autor, ação, origem, processo e correlação; snapshots somente no detalhe.
- **Interface:** `/auditoria` na visão geral do OTO, com grade, filtros na URL, paginação,
  diálogo antes/depois, estados de carregamento/erro/vazio, cancelamento e limpeza de cache
  ao revogar acesso. Usa o tema do [protótipo preservado](../referencias/interface-oto/README.md).

## Evidências locais

- Unitários: common 161 (ESM/CommonJS), backend 37 + 6 fixtures e frontend 125.
  Oito testes da página cobrem carregamento, vazio, erro/repetição de lista e detalhe,
  diferenças, filtros, cancelamento e revogação; a cobertura de colunas inclui auditoria.
- Integração PostgreSQL/PostGIS: 66 testes HTTP/schema + 5 de fixtures, sem ignorados.
  Incluem restrições por perfil/ID, regra indevida de gestor, OData, nomes após inativação,
  sanitização legada, bloqueio das três mutações de histórico e rollback de falha física
  ao persistir auditoria. As suítes existentes de autenticação/cadastro/catálogo/inventário
  continuam aprovadas.
- Upgrade em outro banco `_test`, com eventos legados: IDs, entidades, snapshots e timestamps
  preservados; nome, origem e processo preenchidos corretamente. Drift Prisma ausente.
- Chrome com API e PostgreSQL/PostGIS reais e massa fictícia, em ambiente exclusivo de teste:
  login → edição de cadastro → evento e diferenças, filtros, processo automático, logout 401
  e visualizador 403. Lista e detalhe em 390, 768, 1024 e 1440 px sem overflow global.
- Aplicação Docker local atualizada com a migration, sem seed nem reset da base existente;
  histórico preservado e containers saudáveis.
- Validação de referências/hashes, schema Prisma, lint, tipos e build aprovados. O build
  continua emitindo aviso de tamanho do bundle JavaScript; não é uma meta homologada.

Não há resultado de GitHub Actions nem homologação do OTO declarado por estas verificações.
As exceções para limpar fixtures existem apenas em transações de testes `_test` e não
constituem API ou configuração de bypass na aplicação.

## Continuidade e pendências

- Confirmar retenção, anonimização e descarte com o OTO; sem expurgo automático nesta entrega.
- Validar com o OTO o público e a apresentação dos campos auditados. O acesso técnico continua
  exclusivo do administrador conforme a matriz já implementada.
- Importação, pesquisas, respostas e publicação deverão usar o gravador transacional quando
  suas mutações forem implementadas. O suporte a origem/correlação não implementa esses fluxos.
- Próximo incremento funcional: [parte 08](08-importacao-upload-leitura-e-parse.md), condicionado
  aos seus mapeamentos e fontes, preservando as planilhas originais.
