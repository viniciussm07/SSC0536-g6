# Planilhas de referência do projeto OTO

Este diretório reúne as **seis fontes selecionadas para a vertical hoteleira** do projeto,
em sete arquivos, pois o inventário foi recebido em ODS e XLSX. Cada pasta contém cópias
originais e um README com descrição, abas relevantes, uso no projeto, relação com o MER,
decisões pendentes e hashes de integridade.

Os arquivos são esqueletos fornecidos pelo usuário. Servem para mapear estrutura e
metodologia; não constituem base de produção nem série histórica preenchida. Testes de
parse e cálculo usarão exemplos fictícios, com resultados esperados aprovados pelo OTO.

| Pasta                                                                                                | Papel no projeto                                                                   |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Inventário Oficial de Olímpia](inventario-oficial-olimpia/README.md)                                | Cadastro, capacidade e infraestrutura; inventário em dois formatos da mesma fonte. |
| [Tabulação de ocupação consolidada — 2026](tabulacao-consolidadas-2026/README.md)                    | Coleta Consolidado, ocupação realizada e metodologia de fluxo.                     |
| [Tabulação de expectativa de ocupação — 2026](tabulacao-expectativa-2026/README.md)                  | Coleta Expectativa e comparação posterior com Consolidado.                         |
| [Controle operacional de pesquisas](controle-pesquisas/README.md)                                    | Apoio à gestão de edições, participantes e respondentes.                           |
| [Pesquisa de diária média dos meios de hospedagem](pesquisa-diaria-media-meios-hospedagem/README.md) | Coleta de preços e cálculo da diária média.                                        |
| [Indicadores do turismo e referência de BI](indicadores-turismo-2017-2025-bi/README.md)              | Referência de indicadores, comparações, boletins e camada de consumo.              |

## Uso das fontes

Não importar todas as abas nem criar um parser por arquivo indiscriminadamente. Separar
entradas primárias, controles operacionais e resultados derivados. Totais consolidados
não devem ser somados novamente aos dados individuais que os originam. ODS e XLSX do
inventário precisam de uma versão canônica definida, sem dupla importação.

As demais cinco fontes do ZIP não foram copiadas para este diretório, conforme a seleção
do recorte: fluxo de veículos, fretamento rodoviário, Novo CAGED, expectativa de contratações
e questionários individuais de demanda turística. Eventuais parâmetros agregados da pesquisa
de demanda podem ser utilizados após validação, sem importar o questionário completo.

## Pendências para implementar e validar

- Versão canônica do inventário e regra de identificação/associação dos empreendimentos.
- Formulários ou dicionário de coleta com perguntas, opções e obrigatoriedade; não são
  necessárias respostas reais com dados pessoais.
- Metodologia aprovada de ocupação, capacidade, fluxo, pesos e datas de referência.
- Origem e vigência do parâmetro de day use atribuído à Pesquisa de Demanda 2024,
  que não está entre os arquivos recebidos deste ano.
- Massa fictícia com resultados esperados, para verificar importação e cálculos.
- Regra de separação das edições que misturam Expectativa e Consolidado, regularidade
  cadastral, protocolo de diária e agregação de RHC em relação ao MER atual.

O recebimento estrutural atende parte dos pré-requisitos; não significa homologação de
fórmulas nem disponibilidade de histórico numérico para previsão estatística.

## Referências do repositório

- [Plano de implementação](../../docs/plano/README.md).
- [Pré-requisitos de fontes e validações](../../docs/plano/00-prerequisitos-planilhas-e-validacoes.md).
- [Schema Prisma](../../apps/backend/prisma/schema.prisma).
- [Decisões do modelo de dados](../../apps/backend/prisma/README.md).
