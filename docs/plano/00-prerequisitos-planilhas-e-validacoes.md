# 00 — Pré-requisitos: planilhas oficiais e validações

**Situação:** estruturas recebidas em `docs/planilhas`; validações de negócio e massa fictícia homologada ainda pendentes.

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

## Material complementar ainda necessário

- Formulários ou dicionário de coleta com perguntas, opções, obrigatoriedade e unidades;
  não são necessárias respostas reais para especificar o instrumento.
- Regras oficiais de cálculo, incluindo população, pesos, não respondentes e arredondamento.
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
- Matriz inicial de acessos e regra para identificar/conciliar empreendimentos estão registradas.
- Recebimento, análise inicial e pendências ficam documentados; bloqueios não são marcados como concluídos.
- Uma fixture fictícia baseada no esqueleto permite percorrer os campos da primeira entrega.

## Critério de conclusão

Recebimento estrutural registrado, dicionário inicial revisado e massa fictícia com resultados
esperados para o incremento. Registrar separadamente a liberação técnica e a homologação
de negócio, mantendo explícitas as regras ainda pendentes.
Este aceite inicial não equivale à homologação de todos os indicadores ou parsers futuros.
