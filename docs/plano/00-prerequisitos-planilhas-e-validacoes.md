# 00 — Pré-requisitos: planilhas oficiais e validações

**Situação:** estruturas recebidas em `docs/planilhas`; regras parcialmente documentadas por fontes complementares, com confirmação do OTO e massa fictícia homologada ainda pendentes.

A [massa fictícia compartilhada](../../fixtures/oto/README.md) já está disponível para
desenvolvimento e testes técnicos. Seus exemplos e fórmulas demonstrativas ainda não
representam validação metodológica do OTO.

**Rastreabilidade:** Plano v4, seções 3.1, 3.5, 8 e 9.4; RF03–RF06 e RF10–RF15.

**Dependências:** Nenhuma; esta é a condição de entrada do plano.

## Objetivo e condição de início

Os esqueletos foram recebidos e estão organizados no [catálogo de planilhas](../planilhas/README.md).
O recebimento estrutural está atendido para as seis fontes selecionadas; isso permite
inspecionar layouts, mapear campos e preparar parsers e fixtures fictícias. O usuário
informou que não haverá acesso ao conteúdo operacional por restrições de LGPD: não
solicitar dados pessoais reais como condição para desenvolver ou testar a POC.

Antes de fechar cada regra funcional, validar o contrato da parte correspondente com OTO.
A ausência de fórmula ou regra de uma etapa bloqueia sua homologação, não todo trabalho
independente. As estruturas do inventário já permitem preparar o primeiro incremento;
campos obrigatórios, permissões e semântica dos dados ainda precisam de confirmação.

Não inventar um layout de produção: usar os arquivos ODS/XLSX recebidos. Dados preenchidos
para testes devem ser fictícios, em cópias separadas, com resultados esperados revisados.
Não tratar os esqueletos como uma série histórica numérica disponível para previsão.

## Fontes recebidas e uso

| Fonte local                                                                   | Uso no projeto                                            | Pendência principal                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| [Inventário ODS/XLSX](../planilhas/inventario-oficial-olimpia/README.md)      | Cadastro, contatos, Cadastur, catálogos, capacidade e RHC | Versão canônica, legendas, obrigatoriedade e vigências |
| [Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md)             | Ocupação realizada, pesos e fluxo                         | Fórmulas e massa fictícia com resultados aprovados     |
| [Expectativa](../planilhas/tabulacao-expectativa-2026/README.md)              | Ocupação futura declarada e períodos especiais            | Formulário/dicionário e regra de comparação            |
| [Controle de pesquisas](../planilhas/controle-pesquisas/README.md)            | Edições, participação e acompanhamento                    | Edições mistas e significado das marcações             |
| [Diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md) | Preços, recortes e médias                                 | Protocolo, fontes, amostra e datas de coleta/estadia   |
| [Indicadores/BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md)     | Seleção de saídas e comparações                           | Metodologia e público dos indicadores selecionados     |

O inventário foi recebido em dois formatos da mesma fonte; não importar os dois como
bases independentes. As cinco fontes excluídas estão identificadas no catálogo e não
entram automaticamente no escopo hoteleiro.

## Evidências complementares recebidas em 15/11/2026

Foram analisados os nove arquivos do ZIP `drive-download-20261115T034408Z-1-001.zip`.
Os cinco documentos utilizados abaixo estão preservados no
[catálogo de fontes complementares](../referencias/levantamento-oto-2026/README.md),
com localizadores e hashes das cópias. Eles complementam as planilhas; não substituem
seus layouts, o MER ou o Plano de Projeto v4. S1–S5 são identificadores de fonte,
não uma nova numeração de requisitos.

- **S1:** [Perguntas Entrevista.docx](<../referencias/levantamento-oto-2026/Perguntas Entrevista.docx>),
  respostas das perguntas gerais sobre tratamento/adesão/uso dos dados e da pergunta
  específica sobre o procedimento de coleta de diárias no Booking.
- **S2:** [EngSoft_Requirements.pdf](../referencias/levantamento-oto-2026/EngSoft_Requirements.pdf),
  datado de 07/05/2026; página 3, histórias 1.3, 1.4 e 1.6; página 5, histórias 3.1–3.6.
- **S3:** [DescriçãoPlanilhasProjeto.pdf](../referencias/levantamento-oto-2026/DescriçãoPlanilhasProjeto.pdf),
  páginas 1–3, fluxo de alimentação entre inventário, pesquisas e indicadores.
- **S4:** [Entrevista-2.docx](../referencias/levantamento-oto-2026/Entrevista-2.docx),
  pergunta sobre a estabilidade da lista de hotéis e comentários sobre prazos e identificação.
- **S5:** [Modelo-Requisitos do sistema.xlsx](<../referencias/levantamento-oto-2026/Modelo-Requisitos do sistema.xlsx>),
  aba `Requisitos do sistema`, história 9.0, células B12:E12, acesso ao formulário de ocupação.

### Como interpretar o estado das regras

**Parcialmente documentado** significa que há relato ou especificação rastreável, mas
sua vigência, abrangência ou detalhes ainda exigem confirmação do OTO para o projeto atual.
**Conflitante** significa que as fontes descrevem alternativas incompatíveis.
**Pendente** significa que ainda falta definição suficiente para o incremento.
Nenhuma dessas classificações equivale a regra homologada. Recebimento do documento,
prioridade “Obrigatório” ou campo “Finalizado” em um backlog não comprovam aceite ou
implementação neste repositório. Reconciliar o levantamento anterior com o Plano v4,
sem ampliar automaticamente o escopo hoteleiro.

### Regras parcialmente documentadas e confirmações necessárias

| Tema                         | Evidência e origem                                                                                                                                                                                                                             | Confirmação ainda necessária do OTO                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocolo de diária          | **S1**, pergunta específica de diárias: consulta diária ao Booking, simulando um casal e uma criança de até 12 anos. Reforça o protocolo identificado no [esqueleto de diária](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md). | Vigência, idade exata da criança, categoria de quarto, noites, moeda, impostos, alimentação, cancelamento, preço selecionado e tratamento de indisponibilidade. A anotação de antecedência “1/3 semana” é ambígua: esclarecer antes de transformar em intervalo de coleta. Distinguir data da consulta e data da estadia. |
| Amostra e elegibilidade      | **S1** relata recorte de hospedagens com 80 leitos ou mais; **S4**, pergunta da lista de hotéis, descreve lista relativamente estável ao longo do ano e inclusão de novos estabelecimentos, com limitação operacional da coleta manual.        | População atual, limiar e contexto de aplicação, seleção por pesquisa, entrada/saída e encerramento, vigência da capacidade e efeito sobre séries comparáveis. A quantidade histórica citada nos relatos não é população fixa. Não impor 80 leitos como limite do cadastro nem de todas as pesquisas.                     |
| Tipos de pesquisa e períodos | **S2**, p. 5, história 3.1: Consolidado do mês anterior e Expectativa de feriado/período programado. **S4**, comentários: formulários com prazos e recortes temporais.                                                                         | Calendário, datas inclusivas, fuso, abertura/fechamento, respostas tardias e comparação entre Expectativa e Consolidado. O fluxo mensal descrito não exclui Consolidado de períodos especiais existente nas planilhas. A separação das edições legadas mistas continua pendente no MER atual.                             |
| Ocupação ponderada           | **S2**, p. 3, história 1.6, e p. 5, história 3.4: ponderação baseada em leitos, com atualização dos pesos quando a capacidade muda.                                                                                                            | Fórmula completa, unidade da resposta, denominador, população elegível versus respondentes, aplicação por categoria, ausências, arredondamento e versão de capacidade usada. Não aplicar uma média ponderada universal nem recalcular resultados históricos com a capacidade atual por inferência.                        |
| Elegíveis e respondentes     | **S2**, p. 5, histórias 3.2 e 3.6: novos períodos herdam estabelecimentos ativos do inventário e permitem acompanhar respostas/pendências. **S3**, p. 2: controle de pesquisas acompanha estabelecimentos e respondentes.                      | Lista sugerida versus participação automática, critérios de seleção, momento de congelamento da lista, vínculos de acesso e alterações durante a edição. Não incluir todos os ativos em toda pesquisa sem validar seu público.                                                                                            |
| Revisão de inconsistências   | **S1**, perguntas gerais sobre o processo pós-coleta: conferência humana, correção de grafia e revisão/remoção de respostas consideradas inconsistentes antes da consolidação.                                                                 | Limites de outliers, distinção entre corrigir, desconsiderar e excluir, responsáveis, aprovação, justificativa, preservação do original e impacto no recálculo. O relato não autoriza descarte automático nem fornece limiares numéricos.                                                                                 |
| Encerramento e auditoria     | **S2**, p. 3, histórias 1.3 e 1.4: inativação em vez de exclusão de empresas encerradas, preservando vínculos; registro de autor, data e valores anteriores/posteriores.                                                                       | Quem pode inativar/reabrir, data efetiva, tratamento de respostas/edições em andamento, retenção e diferença entre correção e mudança real. **S1** relata Cadastur ainda ativo em empresas fechadas: não equiparar Cadastur, regularidade e situação operacional.                                                         |
| Destinatários e finalidade   | **S1**, pergunta sobre utilização dos resultados: Expectativa distribuída também a restaurantes e serviços municipais; Consolidado compartilhado com hospedagens. **S3**, p. 3: indicadores apoiam relatórios, monitoramento e planejamento.   | Destinatários atuais, recortes publicados, granularidade, sigilo, liberação/publicação e permissões por perfil. Receber boletim não implica acesso aos dados individuais.                                                                                                                                                 |
| Dependências dos indicadores | **S3**, pp. 1–3: inventário alimenta pesquisas; demanda e diária alimentam ocupação/fluxo e indicadores; a planilha de indicadores consolida fontes.                                                                                           | Matriz campo → origem → transformação → resultado, fórmulas e parâmetros aprovados. O fluxograma reforça a linhagem, mas não fornece o parâmetro day use de 2024 nem libera fontes externas fora do recorte.                                                                                                              |

### Conflitos que não devem ser resolvidos por suposição

- **Autenticação da resposta:** S4, comentários, propõe identificar a empresa no formulário
  após login e sugere CNPJ como possível login. S5, B12:E12, descreve ocupação por link
  público sem autenticação. O [plano de contas](02-autenticacao-e-contas.md) e o
  [painel do empresário](13-respostas-e-painel-do-empresario.md) seguem o recorte atual
  de acesso autenticado; registrar a decisão com o OTO antes de alterar esse fluxo.
- **Identidade por CNPJ:** a sugestão de login em S4 não define obrigatoriedade, unicidade,
  filiais, empreendimentos sem CNPJ ou vínculo de uma pessoa com várias empresas.
  Manter a pendência de identidade estável e a ausência de unicidade aprovada no MER.
- **Cobertura da coleta:** a lista estável e o limiar histórico de S1/S4 coexistem com
  propostas de ampliar a coleta quando automatizada. Confirmar a política por pesquisa;
  não transformar restrição manual histórica em regra global de elegibilidade.

## Pendências que permanecem abertas

- Versão canônica ODS/XLSX do inventário, legendas, obrigatoriedade e semântica dos campos.
- Dicionário completo dos formulários, opções, unidades e possibilidade de edição por versão.
- Identidade estável/CNPJ e matriz final de acessos, incluindo resolução do conflito S4/S5.
- Protocolo de diárias e amostra atuais, conforme as confirmações da tabela acima.
- Fórmulas completas, pesos por recorte, capacidade vigente, não respondentes e arredondamento.
- Valor, definição, origem e vigência do day use de 2024; os documentos novos não suprem essa fonte.
- Tratamento de RHC, edições mistas, comparação de períodos e marcações do controle legado.
- Massa fictícia com entradas/saídas esperadas aprovadas; histórico autorizado suficiente
  somente se for avaliada previsão real. O ZIP não atende esses dois requisitos.

## Material complementar ainda necessário

- Formulários ou dicionário de coleta com perguntas, opções, obrigatoriedade e unidades;
  não são necessárias respostas reais para especificar o instrumento.
- Fichas oficiais de cálculo e protocolo de coleta, completando as evidências parciais acima:
  população, pesos, não respondentes, capacidade vigente, diárias, outliers e arredondamento.
- Definição, origem e vigência do parâmetro day use atribuído à Pesquisa de Demanda 2024,
  mencionada em `TABULAÇÃO!B97` do Consolidado; seu arquivo não consta do conjunto recebido.
- Regras de identidade estável dos empreendimentos e das edições; não presumir CNPJ único.
- Massa fictícia coerente entre fontes, com entradas e resultados esperados revisados pelo OTO.
- Histórico numérico autorizado e suficiente apenas se for avaliada previsão real; os
  esqueletos não atendem essa condição e a entrega operacional não depende dela.

## Registro de recebimento

- Criar um catálogo por arquivo: identificador, nome, responsável, versão/data, formato,
  checksum, local de acesso autorizado, abas, intervalo temporal e finalidade.
- Identificar cabeçalhos em várias linhas, células mescladas, abas ocultas, fórmulas,
  valores calculados em cache, totais, filtros, datas, percentuais e unidades.
- Registrar quais abas são entradas, quais são tabulação e quais são apenas apresentação.
- Preparar exemplos fictícios de duplicidades, campos ausentes, nomes divergentes, CNPJ ausente,
  empreendimento encerrado e respostas fora do prazo, preservando o layout recebido.
- Preservar os esqueletos recebidos e os hashes registrados nos READMEs locais; criar fixtures
  fictícias separadas. Não copiar dados pessoais remanescentes para fixtures, logs ou exemplos.

## Validações antes de liberar o início

- OTO confirma a versão canônica do inventário e a definição do formulário, com responsável por dúvidas.
- Equipe e OTO aprovam o primeiro recorte: hospedagem, campos, ações e demonstração esperada.
- Matriz inicial de acessos e regra para identificar/conciliar empreendimentos estão registradas,
  com resolução explícita do conflito entre formulário público e área autenticada.
- Para cada regra confirmada, registrar fonte, decisão, responsável do OTO, data, vigência,
  abrangência, partes afetadas e exemplo fictício com resultado esperado; se houver conflito,
  registrar também qual alternativa foi rejeitada. Aprovar por incremento, sem bloquear
  trabalho independente por uma regra ainda pendente de outra funcionalidade.
- Recebimento, análise inicial e pendências ficam documentados; bloqueios não são marcados como concluídos.
- Uma fixture fictícia baseada no esqueleto permite percorrer os campos da primeira entrega.

## Critério de conclusão

Recebimento estrutural registrado, dicionário inicial revisado e massa fictícia com resultados
esperados para o incremento. Registrar separadamente a liberação técnica e a homologação
de negócio, mantendo explícitas as regras ainda pendentes.
Este aceite inicial não equivale à homologação de todos os indicadores ou parsers futuros.
