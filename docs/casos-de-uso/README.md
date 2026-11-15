# Casos de uso — catálogo único

Os diagramas estão em [diagramas.md](diagramas.md). Todos os casos usam o mesmo estilo
visual; a situação de cada identificador está nas tabelas deste README. Para evitar setas
sobrepostas, cada diagrama mostra um ator ou um grupo pequeno de atores; casos
compartilhados podem aparecer em mais de um diagrama.

O catálogo tem **49 casos**: **35 implementados** e **14 planejados**. A homologação do
OTO permanece pendente. “Implementado” significa que existe rota, tela ou comando na POC,
não que a regra de negócio foi homologada.

> Os diagramas usam `usecase-beta` do Mermaid 12, ainda em beta. O GitHub pode exibir os
> blocos como código; para visualização, use as imagens/PDF gerados em
> `tmp/casos-de-uso-drive/` (pasta não versionada).

## Atores

| Ator                         | Papel                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Visitante                    | Pessoa sem sessão que faz login ou ativa a conta com um código.                               |
| Usuário autenticado          | Generalização dos cinco perfis; consulta a própria sessão e o próprio acesso.                 |
| Administrador                | Gerencia contas, vínculos, permissões, visibilidade e catálogos; opera os recursos da equipe. |
| Gestor                       | Opera cadastro, inventário, exportações e indicadores; não gerencia acesso nem catálogos.     |
| Estagiário                   | Apoia cadastro e coleta; não publica, não exporta e não gerencia acesso.                      |
| Visualizador                 | Consulta somente indicadores explicitamente liberados ao perfil.                              |
| Empresário                   | Consulta e altera apenas os próprios vínculos ativos.                                         |
| Operação/CI                  | Aplica migrations, carrega massa/catálogo e verifica a saúde; não é um perfil de negócio.     |
| Equipe OTO                   | Ator geral dos diagramas para Administrador, Gestor e Estagiário; não é um perfil de acesso.  |
| Consumidor de BI (planejado) | Consumidor futuro de dashboards e boletins; ainda não implementado.                           |

> Generalização usada nos diagramas: `Administrador`, `Gestor` e `Estagiário` herdam de
> `Equipe OTO`, que herda de `Usuário autenticado`; `Visualizador` e `Empresário` herdam de
> `Usuário autenticado`. A matriz de permissões em `common/src/acesso/matriz.constants.ts`
> e `docs/contratos/acesso.md` continua sendo a referência de alçada.

## Diagramas

| Diagrama                                 | Casos                              |
| ---------------------------------------- | ---------------------------------- |
| [00. Hierarquia de atores](diagramas.md) | Generalizações dos atores          |
| 01. Sessão e acesso próprio              | UC-01..UC-04 e UC-08               |
| 02. Administração de acesso e auditoria  | UC-05..UC-07, UC-09..UC-11 e UC-36 |
| 03. Contexto do empreendimento           | UC-12                              |
| 04. Cadastro — Equipe OTO                | UC-13..UC-17, UC-19 e UC-20        |
| 05. Catálogo e inventário — Equipe OTO   | UC-21, UC-22 e UC-26..UC-31        |
| 06. Exportação e importação              | UC-18, UC-37 e UC-38               |
| 07. Catálogo — Administrador             | UC-23..UC-25                       |
| 08. Cadastro — Empresário                | UC-13, UC-14, UC-16, UC-19 e UC-20 |
| 09. Catálogo e inventário — Empresário   | UC-21, UC-22 e UC-26..UC-30        |
| 10. Pesquisas e comunicação              | UC-39..UC-43                       |
| 11. Indicadores — consulta               | UC-32 e UC-33                      |
| 12. Indicadores — metodologia e cálculo  | UC-44..UC-46 e UC-48               |
| 13. Operação e consumo                   | UC-34, UC-35, UC-47 e UC-49        |

## Status dos casos

### Autenticação e sessão

| ID    | Caso de uso             | Atores              | Status       | Parte/RF  | Evidência ou dependência                                    |
| ----- | ----------------------- | ------------------- | ------------ | --------- | ----------------------------------------------------------- |
| UC-01 | Realizar login          | Visitante           | Implementado | 02 / RF19 | `POST /api/sessoes`; `/entrar`; testes de autenticação      |
| UC-02 | Consultar sessão atual  | Usuário autenticado | Implementado | 02 / RF19 | `GET /api/sessoes/atual`; recuperação no layout autenticado |
| UC-03 | Encerrar sessão         | Usuário autenticado | Implementado | 02 / RF19 | `DELETE /api/sessoes/atual`; ação Sair                      |
| UC-04 | Ativar conta com código | Visitante           | Implementado | 02 / RF19 | `POST /api/ativacoes`; formulário em `/entrar`              |

### Administração de acesso e auditoria

| ID    | Caso de uso                            | Atores                 | Status       | Parte/RF        | Evidência ou dependência                                          |
| ----- | -------------------------------------- | ---------------------- | ------------ | --------------- | ----------------------------------------------------------------- |
| UC-05 | Gerar código de recuperação/ativação   | Administrador          | Implementado | 02–03 / RF19    | `POST /api/contas/:id/ativacoes`; `/administracao`                |
| UC-06 | Provisionar conta                      | Administrador; CLI     | Implementado | 02–03 / RF19    | `POST /api/contas`; `pnpm --filter @ssc0536/backend auth:contas`  |
| UC-07 | Gerenciar conta (perfil/situação)      | Administrador          | Implementado | 03 / RF19, RF36 | `PUT /api/contas/:id`; aba Contas                                 |
| UC-08 | Consultar próprio acesso               | Usuário autenticado    | Implementado | 03 / RF19, RF37 | `GET /api/acessos/atual`; contexto autenticado                    |
| UC-09 | Gerenciar vínculos                     | Administrador          | Implementado | 03 / RF21, RF36 | `GET/PUT /api/contas/:id/vinculos...`; diálogo de vínculos        |
| UC-10 | Configurar permissões de perfil        | Administrador          | Implementado | 03 / RF36       | `GET/PUT /api/perfis/:perfil/permissoes`; aba Permissões          |
| UC-11 | Configurar visibilidade de indicadores | Administrador          | Implementado | 03 / RF38       | `GET/PUT /api/perfis/:perfil/visibilidades...`; aba Permissões    |
| UC-12 | Selecionar empreendimento contextual   | Equipe OTO; Empresário | Implementado | 03 / RF21, RF37 | Seletor no cabeçalho; `x-identification`; validação no servidor   |
| UC-36 | Consultar auditoria de alterações      | Administrador          | Planejado    | 07              | Depende de 02–06; a escrita já audita, mas não há consulta visual |

### Cadastro e importação

| ID    | Caso de uso                           | Atores                           | Status       | Parte/RF                | Evidência ou dependência                                                 |
| ----- | ------------------------------------- | -------------------------------- | ------------ | ----------------------- | ------------------------------------------------------------------------ |
| UC-13 | Consultar/listar empreendimentos      | Equipe OTO; Empresário           | Implementado | 04 / RF01, RF23         | `GET /api/empreendimentos` com OData; `/empreendimentos`                 |
| UC-14 | Consultar ficha/detalhe               | Equipe OTO; Empresário           | Implementado | 04 / RF01               | `GET /api/empreendimentos/:id`; `/` com contexto                         |
| UC-15 | Cadastrar empreendimento              | Equipe OTO                       | Implementado | 04 / RF01, RF23         | `POST /api/empreendimentos`; `/empreendimentos/novo`                     |
| UC-16 | Editar empreendimento                 | Equipe OTO; Empresário (próprio) | Implementado | 04 / RF01, RF21         | `PUT /api/empreendimentos/:id`; `/editar`                                |
| UC-17 | Encerrar ou reativar empreendimento   | Equipe OTO                       | Implementado | 04 / RF01               | `PUT /api/empreendimentos/:id` com situação/data                         |
| UC-18 | Exportar empreendimentos              | Administrador; Gestor            | Implementado | 04 / RF01, RF17 parcial | `GET /api/empreendimentos/exportacoes`; API paginada, sem botão dedicado |
| UC-19 | Consultar contatos e Cadastur         | Equipe OTO; Empresário           | Implementado | 04 / RF01               | `GET /api/empreendimentos/:id/contatos` e `/cadastur`                    |
| UC-20 | Consultar respostas do empreendimento | Equipe OTO; Empresário           | Implementado | 03–04 / RF02            | `GET /api/empreendimentos/:id/respostas`; somente leitura                |
| UC-37 | Enviar e ler arquivo                  | Administrador; Gestor            | Planejado    | 08                      | Depende de 00–01 e 04–06; sem upload ou parse implementado               |
| UC-38 | Conciliar e persistir importação      | Administrador; Gestor            | Planejado    | 09                      | Depende de 08 e 10–13; sem conciliação ou persistência de lotes          |

### Catálogos

| ID    | Caso de uso                    | Atores                 | Status       | Parte/RF        | Evidência ou dependência                                          |
| ----- | ------------------------------ | ---------------------- | ------------ | --------------- | ----------------------------------------------------------------- |
| UC-21 | Consultar catálogo do segmento | Equipe OTO; Empresário | Implementado | 05 / RF03, RF22 | `GET /api/segmentos/:id/catalogo`; `/formulario-inventario`       |
| UC-22 | Validar respostas do catálogo  | Equipe OTO; Empresário | Implementado | 05 / RF03, RF22 | `POST /api/segmentos/:id/catalogo/validacoes`                     |
| UC-23 | Gerenciar grupos de catálogo   | Administrador          | Implementado | 05 / RF03       | `GET/POST/PUT /api/catalogos/grupos`; `/catalogos`                |
| UC-24 | Gerenciar itens de catálogo    | Administrador          | Implementado | 05 / RF03       | `GET/POST/PUT /api/catalogos/itens`; `/catalogos`                 |
| UC-25 | Consultar histórico de versões | Administrador          | Implementado | 05 / RF08       | `GET /api/catalogos/itens/:id/versoes`; histórico em `/catalogos` |

### Inventário

| ID    | Caso de uso                        | Atores                 | Status       | Parte/RF        | Evidência ou dependência                                                   |
| ----- | ---------------------------------- | ---------------------- | ------------ | --------------- | -------------------------------------------------------------------------- |
| UC-26 | Consultar inventário vigente       | Equipe OTO; Empresário | Implementado | 06 / RF02, RF23 | `GET /api/empreendimentos/:id/inventarios/vigente`; capacidade na ficha    |
| UC-27 | Consultar histórico de inventários | Equipe OTO; Empresário | Implementado | 06 / RF08, RF23 | `GET /api/empreendimentos/:id/inventarios`; linha do tempo                 |
| UC-28 | Consultar detalhe e diferenças     | Equipe OTO; Empresário | Implementado | 06 / RF08       | `GET /api/empreendimentos/:id/inventarios/:versaoId`; detalhe e diferenças |
| UC-29 | Registrar nova versão              | Equipe OTO; Empresário | Implementado | 06 / RF02, RF23 | `POST /api/empreendimentos/:id/inventarios`; `/inventario/nova-versao`     |
| UC-30 | Corrigir versão                    | Equipe OTO; Empresário | Implementado | 06 / RF08, RF35 | Mesmo `POST` com correção; versão anterior preservada                      |
| UC-31 | Conferir versão                    | Equipe OTO             | Implementado | 06 / RF02       | `PUT /api/empreendimentos/:id/inventarios/:versaoId/conferencia`           |

### Pesquisas e comunicação

| ID    | Caso de uso                                  | Atores     | Status    | Parte/RF | Evidência ou dependência                                         |
| ----- | -------------------------------------------- | ---------- | --------- | -------- | ---------------------------------------------------------------- |
| UC-39 | Gerenciar períodos e calendário              | Equipe OTO | Planejado | 10       | Depende de 06; meses, feriados e períodos de referência          |
| UC-40 | Gerenciar modelos e versões de pesquisa      | Equipe OTO | Planejado | 11       | Depende de 05 e 10; reutilização e versionamento de instrumentos |
| UC-41 | Publicar, encerrar e controlar respondentes  | Equipe OTO | Planejado | 12       | Depende de 11; prazos, elegíveis e ciclo de pesquisa             |
| UC-42 | Responder pesquisa e acompanhar painel       | Empresário | Planejado | 13       | Depende de 12; autenticação e vínculo já existem                 |
| UC-43 | Notificar e registrar preferência de boletim | Empresário | Planejado | 14       | Depende de 12–13; canal de envio ainda não definido              |

### Indicadores e cálculo

| ID    | Caso de uso                                     | Atores                              | Status       | Parte/RF             | Evidência ou dependência                                        |
| ----- | ----------------------------------------------- | ----------------------------------- | ------------ | -------------------- | --------------------------------------------------------------- |
| UC-32 | Consultar indicadores autorizados               | Administrador; Gestor; Visualizador | Implementado | 03 / RF17 parcial    | `GET /api/indicadores`; `/indicadores`; visibilidade por perfil |
| UC-33 | Exportar indicadores                            | Administrador; Gestor               | Implementado | 03/18 parcial / RF17 | `GET /api/indicadores/exportacoes`; botão de exportação JSON    |
| UC-44 | Definir metodologia dos indicadores             | Equipe OTO                          | Planejado    | 15                   | Depende de 01, 06 e 17; fórmulas dependem de homologação do OTO |
| UC-45 | Calcular, recalcular e rastrear resultados      | Equipe OTO                          | Planejado    | 16                   | Depende de 15; revisão, linhagem e recálculo                    |
| UC-46 | Incorporar diárias, RHC e fontes complementares | Equipe OTO                          | Planejado    | 17                   | Depende de 00–01 e 09–10; fontes complementares condicionadas   |
| UC-48 | Avaliar previsão estatística experimental       | Equipe OTO                          | Planejado    | 19                   | Depende de 15–18; experimental e condicionada a histórico       |

### Consumo e operação

| ID    | Caso de uso                           | Atores           | Status       | Parte/RF            | Evidência ou dependência                                                 |
| ----- | ------------------------------------- | ---------------- | ------------ | ------------------- | ------------------------------------------------------------------------ |
| UC-34 | Verificar saúde da API/banco          | Operação/CI      | Implementado | Transversal / RNF05 | `GET /api/health`; healthchecks do Compose e CI                          |
| UC-35 | Preparar ambiente de dados            | Operação/CI      | Implementado | Operacional         | `pnpm db:deploy`, `db:seed`, `db:catalogos`; bootstrap via `auth:contas` |
| UC-47 | Consultar dashboards e gerar boletins | Consumidor de BI | Planejado    | 18                  | Depende de 15–17; Looker Studio/audiência não contratados                |
| UC-49 | Implantar, operar e recuperar         | Operação/CI      | Planejado    | 21                  | Depende de 02–20; produção, backup e restauração não definidos           |

## Observações de escopo

- **UC-18** e **UC-33** exportam a página consultada; não há exportação integral presumida.
- **UC-20** é somente leitura. Responder pesquisa é **UC-42**, planejado.
- **UC-32/33** consultam resultados persistidos; cálculo e metodologia são **UC-44/45**,
  planejados.
- A parte 20 é transversal de qualidade e homologação; não é caso de uso de negócio.
- A existência de permissões para `pesquisas`, `importacoes`, `calculos`, `publicacoes` e
  `auditoria` na matriz não significa que os fluxos correspondentes existam.
