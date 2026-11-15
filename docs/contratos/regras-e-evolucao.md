# Catálogo de regras e evolução

Versão técnica 1, registrada em 15/11/2026. “Técnica” indica decisão de implementação,
não homologação do OTO. A equipe mantenedora responde pela revisão no repositório.
**Responsável nominal, data de aprovação e vigência de negócio do OTO: a designar/confirmar
em todas as regras.** Cada confirmação deve registrar fonte, responsável, data,
abrangência, vigência, impacto, exemplo esperado e alternativa rejeitada em caso de conflito.

## Registro de regras

| ID/versão/estado                | Fonte e decisão                                                                           | Abrangência e impacto histórico                                                                                        | Responsável e evidência                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| R01/v1/técnica                  | MER/AGENTS: ID do sistema identifica; CNPJ opcional sem unique; nome não é chave          | cadastro/conciliação; não unir históricos por nome/CNPJ                                                                | equipe revisa; OTO confirma conciliação; cenário contém homônimos/sem CNPJ       |
| R02/v1/técnica                  | parte 01: ausência/vazio/desconhecido/não se aplica distintos de zero/falso               | todas as entradas; não reclassificar null legado nem perder estados ao gravar                                          | equipe; C03/C04/C06–C09; admissibilidade por campo pelo OTO                      |
| R03/v1/técnica                  | MER/AGENTS: quantidades inteiras ≥0, decimais textuais exatos, datas ISO e horários civis | novos candidatos; sem conversão em massa do banco                                                                      | equipe; testes de limite/calendário/precisão; limites de negócio pelo OTO        |
| R04/v1/técnica                  | parte 01/AGENTS: percentual canônico textual 0–100, escala de origem explícita            | entrada/importação após decodificação; não reinterpretar percentuais legados                                           | equipe; fração 0.75321 = percentual 75.321; OTO confirma unidade original        |
| R05/v1/proposta técnica         | contexto municipal: America/Sao_Paulo operacional, API UTC                                | novos prazos; timestamps sem fuso do MER exigem convenção do serviço                                                   | equipe revisa; OTO confirma calendário/fuso na parte 12                          |
| R06/v1/pendente                 | inventário/parte 06: vigências, correção versus mudança real                              | fim inclusivo/exclusivo, retroatividade, concorrência/capacidade histórica; persistência temporal depende da decisão   | OTO + equipe; testar duas versões na fronteira e mudança dentro do período       |
| R07/v1/pendente                 | inventário AN/AM e S1/S2 da parte 00: Cadastur, regularidade e operação distintos         | inclusão nos indicadores/encerramento; preservar histórico                                                             | OTO; exemplo de encerrado com Cadastur vigente                                   |
| R08/v1/pendente                 | inventário V/tabulação MH!L: tipo não determina categoria                                 | classificação/comparação; não imputar hotel a flat                                                                     | OTO; tabela versionada e exemplo fictício                                        |
| R09/v1/pendente                 | inventário ODS/XLSX e AX:HC: canônico, legendas, obrigatoriedade e escolhas               | importação/formulário; sem interpretar X globalmente                                                                   | OTO; equipe versiona por coluna/grupo; teste futuro “Não” com opção positiva     |
| R10/v1/conflitante              | controle I2 mistura tipos; MER admite um; S4/S5 divergem sobre acesso                     | preservar edição original; separar pesquisas relacionadas ainda é proposta; recorte atual autenticado nas partes 02/13 | OTO + equipe; não migrar edição mista automaticamente nem criar conta de contato |
| R11/v1/pendente                 | tabulações/S2/parte 00: pesos, população, capacidade ajustada e não respondentes          | fórmula, outliers, arredondamento e séries comparáveis; nenhuma média universal aprovada                               | OTO; exemplo completo de entradas/saídas requerido                               |
| R12/v1/pendente                 | TABULAÇÃO!B97: day use da Demanda 2024 ausente                                            | bloqueia fluxo dependente; parâmetro com fonte/versão/vigência                                                         | OTO; sem fallback nem substituição por 2026                                      |
| R13/v1/parcialmente documentada | diária B1:B2/S1: casal/criança/standard/fontes                                            | consulta versus estadia, moeda, impostos, noites, amostra, tipo de dia; não é receita realizada                        | OTO; parte 17 exige protocolo e exemplo versionados                              |
| R14/v1/pendente                 | inventário RHC/BI: agregado por período                                                   | contagem/cobertura/vigência; sem proprietários/CPF nem duplicar totais                                                 | OTO; exemplo fictício 3 RHC/12 leitos a revisar                                  |
| R15/v1/pendente                 | AGENTS/partes 03/18: autoria da sessão/vínculo ativo/visibilidade                         | leitura/escrita/exportação/BI; boletim não libera dado individual                                                      | OTO valida matriz; equipe testa negação cruzada                                  |

Parâmetros e fórmulas de `scenario.json` continuam sintéticos. R01–R05 versionam apenas
o contrato técnico; as demais registram decisões necessárias e seus fluxos dependentes.

## Lista de migrations necessárias por funcionalidade

Na preparação da parte 01, o MER tinha 26 modelos, sem credenciais/sessões, versões de catálogo/formulário,
estado completo de importação e publicação/revisão de resultados. A lista orienta cada
fluxo: **nenhuma migration é criada nesta parte**, conforme o plano 01.

Atualização da parte 02: credenciais locais, sessões, ativações e limites de tentativas
foram adicionados por migration incremental, conforme o
[contrato de autenticação](autenticacao.md). A linha 02 abaixo registra a lacuna de
origem; sua implementação técnica e evidências constam do plano da parte.

| Parte | Lacuna verificada e evolução mínima a projetar                                                                             | Preservação e teste requerido                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 02    | Usuario sem credencial/sessão/recuperação: mecanismos individuais, expiração/revogação                                     | não provisionar por contato; hash seguro; unidade/integração isolada            |
| 03    | perfil textual/vínculo ativo sem matriz configurável completa: permissões/escopo do fluxo                                  | preservar vínculos; acesso cruzado, consultas e exports                         |
| 04    | regularidade/bairro/região/proveniência incompletos; contatos/Cadastur sem histórico explícito: só campos confirmados      | sem unique CNPJ; negócio/auditoria atômicos                                     |
| 05    | catálogo mutável: versão de perguntas/opções/mapeamento                                                                    | não alterar significado de item de inventário antigo                            |
| 06–07 | nullable escalar perde motivo de ausência; falta garantia temporal/concorrência: estados, política de vigência e auditoria | null legado sem motivo inventado; versões/antes/depois preservados na transação |
| 08–09 | falta lote/hash/linha/célula/conciliação: proveniência, idempotência/estados de confirmação                                | originais/hashes; FK e conciliação sem duplicações                              |
| 10–13 | modelo/campo sem versão imutável, elegibilidade/ciclo incompletos: versão, perguntas/prazos/participantes                  | respostas mantêm instrumento; não remover tipoColeta por suposição              |
| 14    | falta preferência/envios: opt-in e canal aprovados                                                                         | aceitar pesquisa não cadastra boletim                                           |
| 15–16 | falta revisão/publicação/proveniência de legado: estado/versões/linhagem/liberação                                         | recálculo não sobrescreve publicado nem inventa linhagem                        |
| 17    | falta protocolo e fonte site próprio; RHC sem definição homologada: metadados confirmados                                  | sem dados pessoais RHC nem preço ofertado tratado como receita                  |

Usar migrations incrementais reais em PostgreSQL/PostGIS de teste. Não resetar banco
nem contornar a proteção da migration inicial para `User` preenchida. Aprovar um item
não aprova os demais.

## Primeiro incremento proposto para aprovação do OTO

**Login individual → empreendimento com vínculo ativo → inventário de hospedagem →
histórico e auditoria**, partes 02–07. Cadastro usa nome fantasia, dados opcionais
conferidos, contato com finalidade definida e situação explícita. Inventário usa
UH/leitos/funcionários/funcionamento e catálogo confirmado, vigência/tipo de alteração e
autor da sessão. A autorização do usuário para a parte 01 não é aceite de negócio do OTO.

Autenticação/autorização podem avançar sem fórmulas de ocupação. Concluir inventário
depende de legendas/obrigatoriedade, conciliação, matriz de acesso, vigências, estados e
catálogos desse recorte. Importação, pesquisas, boletim, BI, diária e previsão seguem os
planos próprios e não integram o primeiro aceite.

Roteiro: OTO designa responsável, confirma recorte e revisa C01–C11; define estados
admissíveis por campo, data efetiva/limites; registra aprovação/ressalvas com versão e
vigência. Equipe demonstra fluxo autenticado, acesso cruzado negado, histórico/auditoria.
Até esse registro: **preparação técnica entregue; homologação de negócio pendente**.
