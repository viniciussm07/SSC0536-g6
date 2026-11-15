# 08 — Importação: upload, leitura e parse de planilhas

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF04 e RF05; RNF02, RNF03 e RNF07.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md), [01](01-contrato-de-dados-e-regras.md), [03](03-perfis-permissoes-e-visibilidade.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).
- [Indicadores e BI](../planilhas/indicadores-turismo-2017-2025-bi/README.md).

Os arquivos ODS/XLSX estão disponíveis para inspeção estrutural. Abrir os binários pertinentes, além de ler os READMEs; construir fixtures preenchidas fictícias a partir desses layouts. Não importar ambos os formatos do inventário como fontes distintas.

## Objetivo

Transformar um arquivo oficial em linhas canônicas rastreáveis, sem gravar diretamente nas tabelas de negócio.

## Pré-requisitos específicos

Arquivo editável autorizado, versão, abas/colunas reais, amostra de erros e mapeamento
aprovado. Definir biblioteca de leitura só após inspecionar os formatos e recursos usados.
Cada família de planilhas deve ter parser e fixture próprios; não reutilizar por semelhança de nome.

## Backend e dados

1. Criar recepção restrita por permissão com limites de tamanho, formato e quantidade de linhas
   definidos a partir do acervo. Inspecionar conteúdo; não executar macros, fórmulas ou links externos.
2. Modelar lote/arquivo, checksum, versão do parser/mapeamento, responsável e estado de processamento.
   O schema atual ainda não representa lotes, linhas brutas e rejeições de importação.
3. Preservar original em armazenamento restrito e uma representação bruta por linha com arquivo,
   aba, linha e coluna; evitar dados pessoais em logs e relatórios públicos.
4. Ler abas, localizar cabeçalhos, ignorar totais explicitamente identificados e preservar células de origem.
5. Tratar datas seriais/textuais, separadores decimais, percentuais, valores calculados em cache,
   células mescladas, vazios e caracteres, conforme regras do contrato, sem inferências silenciosas.
6. Detectar layout desconhecido ou fórmula sem valor confiável; produzir erro acionável em vez
   de persistir valor inventado. Recalcular fórmulas só em etapa controlada e homologada, se necessário.
7. Gerar prévia de linhas canônicas, avisos, erros e dados sem mapeamento para a parte 09.

## Frontend

Seleção de tipo de fonte e arquivo, identificação da versão, progresso/estado,
prévia por aba e relatório de erros com localização e orientação de correção.
Não apresentar a leitura do arquivo como importação concluída.

## Critérios de aceite e testes

- Fixtures derivadas das planilhas oficiais produzem o parse esperado e rastreável.
- Formatos não homologados e mudança de cabeçalho são detectados explicitamente.
- Fórmula ausente, decimal e percentual ambíguos não viram zero ou texto aceito por acaso.
- Upload indevido não grava dados de negócio nem expõe o arquivo a outros perfis.
- Falha/interrupção produz estado recuperável; repetir leitura não cria registros de negócio.

## Fora desta parte

Conciliação de empreendimentos, confirmação e persistência ficam na parte 09. Dados brutos
ficam separados dos registros válidos consumidos pelos indicadores.
