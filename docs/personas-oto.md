# Personas da plataforma OTO

Fonte: *OTO — Consolidação de Requisitos*, versão 1.0, 26/10/2026. Este documento descreve usuários para orientar protótipos, permissões e critérios de aceite. Os requisitos confirmam três tipos de usuário autenticado: **interno**, **empresário** e **visualizador** (RF30–RF34). A divisão do usuário interno em gestor e analista abaixo é uma hipótese de trabalho, não uma decisão de permissões já aprovada pelo OTO.

## Visão geral

| Persona de design | Tipo de acesso previsto | Objetivo principal |
| --- | --- | --- |
| Gestor do OTO | Interno, com permissões administrativas a validar | Controlar acesso e acompanhar a operação da plataforma |
| Analista ou operador do OTO | Interno, com permissões operacionais a validar | Manter dados e pesquisas e analisar indicadores |
| Empresário ou representante de meio de hospedagem | Empresário, vinculado a um empreendimento | Atualizar seu inventário e responder pesquisas |
| Visualizador autorizado | Visualizador, somente leitura | Consultar indicadores liberados para seu perfil |

As personas descrevem **tarefas e necessidades**, não idade, profissão exata ou características pessoais presumidas. Uma pessoa pode desempenhar mais de uma função interna, conforme as permissões acordadas com o OTO.

## 1. Gestor do OTO

**Contexto.** Integrante autorizado do Observatório que responde pela governança do acesso e pela supervisão dos dados apresentados. É uma especialização proposta do perfil interno.

**Objetivos e tarefas.**

- Administrar contas, perfis, vínculos com empreendimentos e permissões, conforme as alçadas aprovadas pelo OTO (RF31–RF34).
- Controlar quais informações podem ser vistas por cada perfil de visualização (RF34).
- Acompanhar pesquisas, resultados e alterações relevantes para apoiar a operação e a prestação de contas (RF17, RF25, RF35).

**Necessidades de interface.** Visão clara dos usuários e seus acessos; confirmação antes de mudanças de permissão; indicação do autor e do momento de alterações relevantes; mensagens explícitas quando um dado não pode ser publicado ou acessado. A interface deve permitir verificar o efeito de uma permissão sem expor dados indevidamente (RNF02, RNF03, RNF10).

**Fluxos a prototipar.** Painel interno; gestão de usuários, perfis e permissões; consulta do histórico de alterações; acesso aos resultados e boletins conforme permissão.

**Limite.** O documento não estabelece um papel administrativo separado. As operações disponíveis para esse gestor e a eventual necessidade de aprovação para publicação ainda exigem validação.

## 2. Analista ou operador do OTO

**Contexto.** Integrante autorizado que executa o trabalho recorrente de cadastro, coleta, conferência e análise. É outra especialização proposta do perfil interno.

**Objetivos e tarefas.**

- Cadastrar, consultar e atualizar meios de hospedagem e seu inventário (RF01, RF03–RF08).
- Criar e acompanhar pesquisas padronizadas de Expectativa e Consolidado, seus prazos e respondentes (RF09–RF11, RF16–RF17, RN01–RN04).
- Importar e conferir planilhas, tratar dados inválidos e consultar resultados, capacidade, ocupação, fluxo e comparações históricas (RF22–RF29, RF36–RF38).

**Necessidades de interface.** Campos e unidades compreensíveis; período e tipo de pesquisa sempre visíveis; indicação de pesquisas abertas, encerradas e sem respostas; prévia dos erros de importação com orientação para correção; rastreabilidade da origem e da atualização dos números. A consulta deve evitar versões divergentes de um mesmo indicador (RNF09, RNF11).

**Fluxos a prototipar.** Painel interno; cadastro de meios de hospedagem; gestão de pesquisas; importação e tratamento de erros; consulta de indicadores, comparações e boletins.

**Limite.** Os formulários e planilhas oficiais, as fórmulas e o alcance das ações desse perfil ainda precisam ser confirmados com o OTO.

## 3. Empresário ou representante de meio de hospedagem

**Contexto.** Pessoa com conta individual vinculada a um empreendimento. O vínculo define quais dados ela pode consultar ou alterar; “representante” contempla a pessoa designada pelo empreendimento, sem presumir que seja necessariamente o proprietário (RF02, RF30, RF32).

**Objetivos e tarefas.**

- Consultar e atualizar os dados do próprio empreendimento, incluindo capacidade, funcionários e infraestrutura quando aplicável (RF02–RF06).
- Encontrar as pesquisas disponíveis no painel autenticado e responder às de ocupação dentro do prazo (RF12–RF14, RF16, RF19).
- Reconhecer se uma pesquisa é de Expectativa ou Consolidado e a que período ela se refere (RF10, RN01–RN02).

**Necessidades de interface.** Entrada institucional confiável; caminho curto até a pesquisa; preenchimento objetivo, inclusive em telas menores; campos obrigatórios sinalizados; opção de zero ou “não se aplica” quando pertinente; confirmação de envio e indicação de pesquisa encerrada. O fluxo atual de resposta foi descrito como inferior a um minuto e serve de referência de simplicidade, não como meta de tempo já homologada (RNF01, RNF12).

**Fluxos a prototipar.** Login; painel do empresário; atualização do inventário; resposta e confirmação de pesquisa.

**Limite.** O empresário só deve ver e alterar dados pertinentes ao seu empreendimento (RF32). O canal de aviso de pesquisas e a distribuição de boletins ainda não estão definidos; não presumir WhatsApp, e-mail ou acesso por link externo como fluxo obrigatório (RF15, RF19).

## 4. Visualizador autorizado

**Contexto.** Pessoa designada pelo OTO para consumir indicadores, com acesso autenticado e somente de leitura (RF30, RF33). O documento não fixa se esse público será interno, de outra área da Prefeitura ou de outra instituição.

**Objetivos e tarefas.** Consultar indicadores liberados, entender o período e a origem dos resultados e comparar dados históricos quando essas informações estiverem disponíveis para seu perfil (RF27–RF29, RF33–RF34).

**Necessidades de interface.** Identificação clara de indicadores, unidades, filtros e períodos; estado sem dados; ausência de controles de edição; resposta compreensível ao tentar abrir conteúdo sem permissão. A experiência deve funcionar com teclado e contraste adequado (RNF03, RNF08).

**Fluxos a prototipar.** Login; painel somente leitura; consulta de indicadores e, se autorizado, resultados e boletins.

**Limite.** “Visualizador” não equivale a acesso público. O OTO ainda deve decidir quais indicadores cada grupo poderá ver e quais serão publicados (RF34).

## Acesso sem autenticação e partes interessadas

**Visitante da home.** Pode ser considerado no desenho da entrada institucional e do caminho para login. Não há requisito aprovado para consulta pública irrestrita de indicadores; por isso, não é uma quinta persona autenticada nem deve orientar a exposição de dados sensíveis. A home pública e seu conteúdo exato dependem de validação.

**Equipe de TI da Prefeitura.** Participa das decisões de infraestrutura e hospedagem. É uma parte interessada operacional, mas os requisitos atuais não definem para ela um perfil próprio de uso da aplicação.

**Turista ou participante de outras pesquisas.** Aparece no contexto amplo das frentes do Observatório, mas o conjunto de requisitos atual prioriza inventário e pesquisas de ocupação respondidas pelos meios de hospedagem. Não há fluxo de acesso do turista definido para esta versão.

## Decisões a validar com o OTO

1. Quais perfis entram na primeira versão e se gestor e analista exigem permissões distintas.
2. Quem poderá criar usuários, vincular representantes a empreendimentos e liberar indicadores para visualizadores.
3. Qual é o público dos visualizadores e quais dados cada grupo poderá consultar.
4. Se haverá conteúdo público na home além de apresentação institucional e login.
5. Quais canais serão usados para avisos de pesquisas e distribuição de boletins.

Essas decisões correspondem às pendências de validação da seção 5 da *Consolidação de Requisitos* e devem ser resolvidas antes de fechar os protótipos e as regras de autorização.
