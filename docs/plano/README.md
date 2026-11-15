# Plano de implementação da plataforma OTO

## Objetivo e situação atual

Este diretório organiza a implementação da POC completa prevista no **Plano de Projeto v4.0,
26/10/2026**, fornecido pelo usuário no arquivo `[USP __ OTO] - Plano de Projeto v4.docx.pdf`.
A referência de escopo são as seções 3.1, 3.3 (RF01–RF39), 3.4 (RNF01–RNF14), 3.5, 7 e 9.
O PDF original não é copiado para o repositório por este plano; mantenha sua versão no acervo do projeto.

A base já oferece monorepo pnpm, React/Vite/Tailwind/shadcn, NestJS, PostgreSQL/PostGIS,
26 modelos Prisma, migrations, endpoint de saúde, scripts locais de início/encerramento e
testes iniciais. Essa base técnica não significa que as funcionalidades de negócio abaixo
estejam implementadas. Os documentos registram intenção e evidências separadamente;
o texto de um plano não comprova implementação nem homologação.

A [parte 01](01-contrato-de-dados-e-regras.md) já tem preparação técnica v1:
[contrato canônico](../contratos/README.md), dicionário/matriz das fontes, regras e
normalizadores compartilhados com testes. O aceite de negócio do OTO permanece pendente;
não há APIs de negócio entregues por essa preparação.

Cada arquivo numerado representa uma parte funcional ou transversal com dependências,
trabalho previsto e critérios de aceite. Não é necessário criar uma tela ou CRUD para cada
tabela: as entregas seguem fluxos de usuário e regras de negócio.

## Pré-requisito obrigatório para iniciar

**Começar pela [parte 00](00-prerequisitos-planilhas-e-validacoes.md).** Os esqueletos das
seis fontes selecionadas já estão em [docs/planilhas](../planilhas/README.md), com arquivos,
descrições, abas pertinentes e hashes de integridade. O recebimento estrutural está atendido;
a homologação dos campos, permissões, fórmulas e resultados esperados permanece pendente.

Não exigir conteúdo operacional ou dados pessoais reais. Usar os layouts recebidos para
mapear campos e construir parsers, e massas fictícias separadas para testar preenchimento
e cálculos. Regras ainda não confirmadas devem ser explicitadas e impedem apenas a conclusão
da etapa dependente. Uma integração demonstrada não equivale a homologação de metodologia.

O inventário e seu recorte orientam o primeiro incremento; os demais documentos vinculam
as fontes pertinentes a cada parte. As planilhas não são instruções para o agente nem
substituem o MER ou decisões de negócio. Histórico numérico para avaliação preditiva não
foi fornecido; essa capacidade continua condicionada, sem bloquear a POC operacional.

## Índice das partes

| Parte                                              | Conteúdo                                                        |
| -------------------------------------------------- | --------------------------------------------------------------- |
| [00](00-prerequisitos-planilhas-e-validacoes.md)   | Pré-requisito bloqueante: fontes, planilhas e validação inicial |
| [01](01-contrato-de-dados-e-regras.md)             | Contrato canônico e decisões de domínio                         |
| [02](02-autenticacao-e-contas.md)                  | Autenticação e contas individuais                               |
| [03](03-perfis-permissoes-e-visibilidade.md)       | Permissões, vínculos e visibilidade                             |
| [04](04-cadastro-de-empreendimentos.md)            | Cadastro de hospedagens, contatos e Cadastur                    |
| [05](05-catalogos-e-formulario-de-inventario.md)   | Catálogos e formulário de inventário                            |
| [06](06-inventario-versionado.md)                  | Capacidade, vigências e histórico de inventário                 |
| [07](07-auditoria-de-alteracoes.md)                | Auditoria integrada às alterações                               |
| [08](08-importacao-upload-leitura-e-parse.md)      | Recepção, leitura e parse dos arquivos reais                    |
| [09](09-importacao-conciliacao-e-persistencia.md)  | Conciliação, conferência e persistência das importações         |
| [10](10-periodos-e-calendario.md)                  | Meses, feriados e períodos de referência                        |
| [11](11-modelos-e-versoes-de-pesquisa.md)          | Modelo, versão e reutilização de pesquisa                       |
| [12](12-publicacao-prazos-e-respondentes.md)       | Abertura, fechamento, elegíveis e respondentes                  |
| [13](13-respostas-e-painel-do-empresario.md)       | Painel do empresário e envio de respostas                       |
| [14](14-notificacoes-e-preferencias-de-boletim.md) | Avisos e preferência de boletim                                 |
| [15](15-metodologia-dos-indicadores.md)            | Fórmulas oficiais e massa de referência                         |
| [16](16-calculo-recalculo-e-rastreabilidade.md)    | Cálculo, recálculo, revisão e linhagem                          |
| [17](17-diarias-rhc-e-fontes-complementares.md)    | Diárias, RHC e fontes complementares aprovadas                  |
| [18](18-consulta-dashboards-e-boletins.md)         | Consumo, Looker Studio e boletins                               |
| [19](19-previsao-estatistica-experimental.md)      | Viabilidade e previsão estatística experimental                 |
| [20](20-qualidade-testes-e-homologacao.md)         | Testes, CI e homologação por incremento                         |
| [21](21-implantacao-operacao-e-recuperacao.md)     | Ambientes, publicação, backup e operação                        |

## Ordem de execução e entregas demonstráveis

A ordem numérica facilita consulta; as dependências de cada arquivo determinam quando
executar. Qualidade e operação são transversais e começam com o primeiro incremento.
Não executar 22 etapas isoladas de backend para só depois iniciar a interface.

| Incremento                   | Partes envolvidas                               | Resultado esperado para demonstração                                                                       |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Preparação obrigatória       | 00–01                                           | Esqueletos recebidos, fixtures fictícias, mapeamento inicial e regras do primeiro fluxo aprovados          |
| 1. Acesso e inventário       | 02–07, com 20–21 desde o início                 | Operador cadastra hospedagem; empresário acessa apenas seu vínculo; atualização cria histórico e auditoria |
| 2. Migração inicial de dados | 08–09                                           | Layout recebido com dados fictícios é lido, conferido, conciliado e incorporado sem duplicações            |
| 3. Pesquisas operacionais    | 10–14                                           | Edição padronizada abre/encerra; empresário responde; OTO acompanha respondentes e preferências            |
| 4. Indicadores e consumo     | 15–18                                           | Cálculo reproduz tabulação oficial, revisão é rastreável e resultados liberados chegam à consulta/boletim  |
| 5. Capacidade experimental   | 19, somente se viável                           | Avaliação temporal reproduzível e eventual previsão, separada da expectativa declarada                     |
| Homologação e entrega        | 20–21 em todos os incrementos e validação final | Fluxos aceitos, ambiente operável, backup restaurado e documentação transferida                            |

Depois da preparação, podem avançar em paralelo a definição de indicadores, o desenho
validado das interfaces e a infraestrutura de qualidade/operação. Na implementação,
autenticação sustenta permissões e auditoria; estas sustentam cadastros e inventário.
Parse pode avançar após o contrato da fonte, mas confirmação/persistência exige as regras
dos módulos de destino. Importação de pesquisas depende também das partes 10–13.

A parte 17 libera apenas as fontes complementares aprovadas e não precisa bloquear a
primeira ocupação se sua fórmula não utilizar esses insumos. A preferência de boletim pode
ser integrada ao fluxo de resposta após a parte 14, sem impedir a demonstração inicial da coleta.

## Priorização e limites de escopo

- Primeiro resultado: **login → empreendimento autorizado → inventário atualizado →
  histórico e auditoria**. Usar uma massa fictícia e regras validadas, inclusive para acesso indevido.
- Depois, importação de inventário e uma pesquisa canônica de ocupação com um período de
  referência. Reproduzir resultados esperados de um caso fictício homologado pelo OTO antes
  de liberar indicadores para consumo.
- O RF22 prevê extensão a segmentos turísticos; o primeiro formulário é o de hospedagem.
  Outros formulários dependem de instrumentos e priorização próprios, sem reconstruir a plataforma.
- Diária média já possui esqueleto recebido, com protocolo e metodologia a validar; avisos
  dependem de definição do canal; integração
  Looker Studio depende de audiência, autorização e acesso a dados aprovados pelo OTO.
- A previsão estatística é experimental e condicionada, conforme o Plano v4. Não trocar
  respostas de Expectativa por previsões de modelo nem prometer precisão antes da avaliação.
- Acervo amplo do OTO não amplia automaticamente o recorte: pesquisa direta com turistas,
  CAGED, ISSQN, rodovias e demais frentes entram somente mediante decisão de escopo.

## Lacunas conhecidas da base a tratar por funcionalidade

O schema atual é ponto de partida, sujeito ao contrato das fontes reais. Além dos serviços
e telas, faltam mecanismos completos para autenticação/sessão (02), visibilidade configurável
(03), histórico de catálogos (05), lotes/proveniência de importação (08–09), versões de
formulários (11), elegibilidade e ciclo de pesquisa (12), preferências/envios (14) e revisão,
linhagem e publicação dos cálculos (16). Previsão exige modelagem própria somente se liberada (19).

Não adicionar tudo em uma única migration especulativa. Cada incremento entrega a evolução
mínima do schema, preservação dos dados, testes e documentação de suas regras. As decisões
atuais de nulabilidade e CNPJ continuam sujeitas à confirmação das fontes, sem reset do banco.

## Rastreabilidade dos requisitos funcionais

IDs e descrições resumidas seguem o **Plano v4**, e não a numeração dos documentos antigos.
Partes listadas compartilham a entrega; 20–21 dão suporte transversal de qualidade/operação.

| Requisito | Resultado previsto                       | Partes                                                                                                                                                                                                                 |
| --------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01      | Gerenciar meios de hospedagem            | [04](04-cadastro-de-empreendimentos.md), [06](06-inventario-versionado.md)                                                                                                                                             |
| RF02      | Registrar dados coletados                | [06](06-inventario-versionado.md), [13](13-respostas-e-painel-do-empresario.md)                                                                                                                                        |
| RF03      | Padronizar entrada de dados              | [01](01-contrato-de-dados-e-regras.md), [05](05-catalogos-e-formulario-de-inventario.md), [13](13-respostas-e-painel-do-empresario.md)                                                                                 |
| RF04      | Importar planilhas                       | [00](00-prerequisitos-planilhas-e-validacoes.md), [08](08-importacao-upload-leitura-e-parse.md), [09](09-importacao-conciliacao-e-persistencia.md), [17](17-diarias-rhc-e-fontes-complementares.md)                    |
| RF05      | Validar dados recebidos                  | [01](01-contrato-de-dados-e-regras.md), [08](08-importacao-upload-leitura-e-parse.md), [09](09-importacao-conciliacao-e-persistencia.md)                                                                               |
| RF06      | Tratar e normalizar dados                | [01](01-contrato-de-dados-e-regras.md), [08](08-importacao-upload-leitura-e-parse.md), [09](09-importacao-conciliacao-e-persistencia.md), [17](17-diarias-rhc-e-fontes-complementares.md)                              |
| RF07      | Centralizar dados turísticos             | [01](01-contrato-de-dados-e-regras.md), [04](04-cadastro-de-empreendimentos.md), [09](09-importacao-conciliacao-e-persistencia.md)                                                                                     |
| RF08      | Manter histórico                         | [06](06-inventario-versionado.md), [09](09-importacao-conciliacao-e-persistencia.md), [11](11-modelos-e-versoes-de-pesquisa.md), [16](16-calculo-recalculo-e-rastreabilidade.md)                                       |
| RF09      | Comparar períodos                        | [10](10-periodos-e-calendario.md), [18](18-consulta-dashboards-e-boletins.md)                                                                                                                                          |
| RF10      | Calcular ocupação                        | [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md)                                                                                                                               |
| RF11      | Calcular expectativa de ocupação         | [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md)                                                                                                                               |
| RF12      | Calcular capacidade disponível           | [06](06-inventario-versionado.md), [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md)                                                                                            |
| RF13      | Calcular fluxo estimado                  | [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md), [17](17-diarias-rhc-e-fontes-complementares.md)                                                                              |
| RF14      | Calcular diária média, se fonte incluída | [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md), [17](17-diarias-rhc-e-fontes-complementares.md)                                                                              |
| RF15      | Calcular variação entre períodos         | [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md), [18](18-consulta-dashboards-e-boletins.md)                                                                                   |
| RF16      | Analisar sazonalidade                    | [15](15-metodologia-dos-indicadores.md), [18](18-consulta-dashboards-e-boletins.md), [19](19-previsao-estatistica-experimental.md)                                                                                     |
| RF17      | Disponibilizar camada de consumo         | [18](18-consulta-dashboards-e-boletins.md)                                                                                                                                                                             |
| RF18      | Visualizar tendências e variações        | [18](18-consulta-dashboards-e-boletins.md), [19](19-previsao-estatistica-experimental.md)                                                                                                                              |
| RF19      | Autenticar usuários                      | [02](02-autenticacao-e-contas.md)                                                                                                                                                                                      |
| RF20      | Gerenciar formulários de pesquisa        | [11](11-modelos-e-versoes-de-pesquisa.md), [12](12-publicacao-prazos-e-respondentes.md)                                                                                                                                |
| RF21      | Inventário do próprio empreendimento     | [03](03-perfis-permissoes-e-visibilidade.md), [06](06-inventario-versionado.md)                                                                                                                                        |
| RF22      | Diferenciar formulários por segmento     | [05](05-catalogos-e-formulario-de-inventario.md)                                                                                                                                                                       |
| RF23      | Manter inventário atualizado             | [04](04-cadastro-de-empreendimentos.md), [06](06-inventario-versionado.md)                                                                                                                                             |
| RF24      | Distinguir Expectativa e Consolidado     | [10](10-periodos-e-calendario.md), [12](12-publicacao-prazos-e-respondentes.md)                                                                                                                                        |
| RF25      | Reutilizar modelos                       | [11](11-modelos-e-versoes-de-pesquisa.md)                                                                                                                                                                              |
| RF26      | Responder pesquisas autenticadas         | [13](13-respostas-e-painel-do-empresario.md)                                                                                                                                                                           |
| RF27      | Identificar empreendimento respondente   | [13](13-respostas-e-painel-do-empresario.md)                                                                                                                                                                           |
| RF28      | Registrar ocupação por período           | [10](10-periodos-e-calendario.md), [13](13-respostas-e-painel-do-empresario.md)                                                                                                                                        |
| RF29      | Registrar preferência de boletim         | [14](14-notificacoes-e-preferencias-de-boletim.md)                                                                                                                                                                     |
| RF30      | Definir prazo e encerrar pesquisa        | [12](12-publicacao-prazos-e-respondentes.md), [13](13-respostas-e-painel-do-empresario.md)                                                                                                                             |
| RF31      | Controlar respondentes                   | [12](12-publicacao-prazos-e-respondentes.md), [13](13-respostas-e-painel-do-empresario.md)                                                                                                                             |
| RF32      | Incorporar respostas automaticamente     | [13](13-respostas-e-painel-do-empresario.md), [16](16-calculo-recalculo-e-rastreabilidade.md)                                                                                                                          |
| RF33      | Notificar abertura de pesquisa           | [14](14-notificacoes-e-preferencias-de-boletim.md)                                                                                                                                                                     |
| RF34      | Gerar boletins                           | [18](18-consulta-dashboards-e-boletins.md)                                                                                                                                                                             |
| RF35      | Propagar atualizações relacionadas       | [01](01-contrato-de-dados-e-regras.md), [06](06-inventario-versionado.md), [09](09-importacao-conciliacao-e-persistencia.md), [15](15-metodologia-dos-indicadores.md), [16](16-calculo-recalculo-e-rastreabilidade.md) |
| RF36      | Gerenciar perfis e permissões            | [03](03-perfis-permissoes-e-visibilidade.md)                                                                                                                                                                           |
| RF37      | Restringir visualização e edição         | [03](03-perfis-permissoes-e-visibilidade.md)                                                                                                                                                                           |
| RF38      | Configurar visibilidade                  | [03](03-perfis-permissoes-e-visibilidade.md), [18](18-consulta-dashboards-e-boletins.md)                                                                                                                               |
| RF39      | Registrar alterações                     | [07](07-auditoria-de-alteracoes.md)                                                                                                                                                                                    |

## Rastreabilidade dos requisitos não funcionais

| Requisito | Aspecto                      | Partes principais                                                                                                                                                                                                                                                                                                            |
| --------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF01     | Usabilidade                  | [04](04-cadastro-de-empreendimentos.md), [05](05-catalogos-e-formulario-de-inventario.md), [13](13-respostas-e-painel-do-empresario.md), [18](18-consulta-dashboards-e-boletins.md), [20](20-qualidade-testes-e-homologacao.md)                                                                                              |
| RNF02     | Segurança                    | [02](02-autenticacao-e-contas.md), [03](03-perfis-permissoes-e-visibilidade.md), [08](08-importacao-upload-leitura-e-parse.md), [20](20-qualidade-testes-e-homologacao.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                   |
| RNF03     | Privacidade                  | [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md), [08](08-importacao-upload-leitura-e-parse.md), [14](14-notificacoes-e-preferencias-de-boletim.md), [18](18-consulta-dashboards-e-boletins.md), [20](20-qualidade-testes-e-homologacao.md), [21](21-implantacao-operacao-e-recuperacao.md) |
| RNF04     | Desempenho                   | [18](18-consulta-dashboards-e-boletins.md), [20](20-qualidade-testes-e-homologacao.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                                                                                                       |
| RNF05     | Confiabilidade               | [20](20-qualidade-testes-e-homologacao.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                                                                                                                                                   |
| RNF06     | Manutenibilidade             | [01](01-contrato-de-dados-e-regras.md), [20](20-qualidade-testes-e-homologacao.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                                                                                                           |
| RNF07     | Escalabilidade               | [08](08-importacao-upload-leitura-e-parse.md), [11](11-modelos-e-versoes-de-pesquisa.md), [17](17-diarias-rhc-e-fontes-complementares.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                                                    |
| RNF08     | Acessibilidade               | [05](05-catalogos-e-formulario-de-inventario.md), [13](13-respostas-e-painel-do-empresario.md), [18](18-consulta-dashboards-e-boletins.md), [20](20-qualidade-testes-e-homologacao.md)                                                                                                                                       |
| RNF09     | Integridade e consistência   | [01](01-contrato-de-dados-e-regras.md), [06](06-inventario-versionado.md), [09](09-importacao-conciliacao-e-persistencia.md), [12](12-publicacao-prazos-e-respondentes.md), [16](16-calculo-recalculo-e-rastreabilidade.md), [20](20-qualidade-testes-e-homologacao.md)                                                      |
| RNF10     | Rastreabilidade              | [06](06-inventario-versionado.md), [07](07-auditoria-de-alteracoes.md), [09](09-importacao-conciliacao-e-persistencia.md), [16](16-calculo-recalculo-e-rastreabilidade.md), [20](20-qualidade-testes-e-homologacao.md)                                                                                                       |
| RNF11     | Simplicidade da coleta       | [05](05-catalogos-e-formulario-de-inventario.md), [13](13-respostas-e-painel-do-empresario.md), [20](20-qualidade-testes-e-homologacao.md)                                                                                                                                                                                   |
| RNF12     | Padronização histórica       | [01](01-contrato-de-dados-e-regras.md), [05](05-catalogos-e-formulario-de-inventario.md), [06](06-inventario-versionado.md), [10](10-periodos-e-calendario.md), [11](11-modelos-e-versoes-de-pesquisa.md), [20](20-qualidade-testes-e-homologacao.md)                                                                        |
| RNF13     | Modularidade de implantação  | [20](20-qualidade-testes-e-homologacao.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                                                                                                                                                   |
| RNF14     | Confiabilidade institucional | [02](02-autenticacao-e-contas.md), [12](12-publicacao-prazos-e-respondentes.md), [14](14-notificacoes-e-preferencias-de-boletim.md), [21](21-implantacao-operacao-e-recuperacao.md)                                                                                                                                          |

## Planejamento de execução e responsáveis

Distribuir por competências e validar disponibilidade real da equipe antes de estimar datas:
requisitos/relacionamento com OTO; dados/metodologia; backend/integrações;
frontend/UX; qualidade/DevOps. Para cada parte, registrar responsável principal,
revisor, validador de negócio, estimativa, dependências e evidência de aceite no backlog.

O cronograma original prevê primeira versão funcional em 15/11/2026, integração/indicadores
em 30/11/2026, testes/homologação em 07/12/2026 e entrega em 15/12/2026. São marcos do
plano de origem, não novas promessas de execução. Reavaliá-los com disponibilidade das
fontes, tamanho real da equipe e escopo de cada incremento; não considerar a estrutura
Prisma como cumprimento do marco funcional.

Em cada revisão semanal, atualizar bloqueios e prioridade; em demonstrações ao OTO,
validar o fluxo completo e registrar decisões. Acordar limites mensuráveis de desempenho,
disponibilidade, backup e usabilidade antes de medir seu aceite.

## Acompanhamento e definição de pronto

Cada parte começa como **planejada**. Sugestão de estados no backlog: planejada,
bloqueada por pré-requisito, pronta para iniciar, em implementação, em validação e aceita.
Os esqueletos foram recebidos; isso não significa que sua metodologia foi homologada; concluir código não
significa aceite do cliente. Evidenciar separadamente a conclusão técnica e a de negócio.

Uma entrega só está pronta quando o fluxo de interface/API/banco funciona, regras e
permissões estão testadas, auditoria aplicável está integrada, migrations e dados são
rastreáveis e o roteiro de aceite da parte 20 foi atendido. Integração simulada deve ser
identificada como tal e não encerra dependência de canal, fonte ou serviço externo.

## Documentos de apoio do repositório

- [Modelo Prisma e decisões atuais](../../apps/backend/prisma/README.md).
- [Personas](../personas-oto.md): referência de necessidades, sujeita à matriz de permissões validada.
- [Gestão de qualidade e aceitação](../gestao-qualidade-e-aceitacao.md): reaproveitar o método e revisar a numeração de requisitos conforme o Plano v4.
- [Frentes de operação](../frentes-de-operacao-oto.md): contexto do acervo amplo; não equivale ao escopo obrigatório desta POC.
