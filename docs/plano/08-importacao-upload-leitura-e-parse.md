# 08 — Importação: upload, leitura e parse de planilhas

**Situação:** implementação parcial para a família **Tabulação Consolidado** (recepção, lotes,
leitura e prévia com erros). As demais famílias seguem planejadas. Contrato e regras em
[docs/contratos/importacao.md](../contratos/importacao.md). Não há homologação do OTO.

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

## Estado da implementação

**Entregue (conclusão técnica, com dados fictícios):**

- Schema e migration `20261126000000_importacao_lotes`: `importacao_lote` (checksum, versão do
  parser, estado, responsável, resumo), `importacao_arquivo` (original restrito),
  `importacao_linha` (células de origem por aba/linha/coluna e canônico candidato) e
  `importacao_ocorrencia`. Sem tabelas de negócio tocadas.
- Backend `apps/backend/src/importacoes`: leitor OOXML seguro (`fflate` + `fast-xml-parser`, sem
  macros, vínculos ou recálculo), parser da `TABULAÇÃO`, serviço transacional com auditoria,
  releitura idempotente e recuperação de leitura interrompida, coleções OData de lotes, linhas e
  ocorrências, upload binário com limite de tamanho.
- `common/src/importacao`: contratos, limites, códigos de ocorrência e guardas.
- Frontend `/importacoes`: seleção de fonte e arquivo (TanStack Form), lista de lotes, prévia com
  erros localizados e orientação, aviso explícito de que leitura não é importação.
- Fixtures fictícias em `fixtures/oto/importacao` (com e sem erros).

**Evidências:** testes unitários do parser e do leitor (`apps/backend/test/importacoes.test.ts`),
integração HTTP/PostgreSQL (`importacoes.integration.test.ts`, banco `_test`), contratos em
`common/test/importacao` e página (`apps/frontend/src/pages/importacoes`).

**Ajuste transversal:** a verificação de origem das escritas passou a aceitar
`application/octet-stream` além de `application/json` (o cabeçalho `X-OTO-Request` e a origem
continuam obrigatórios).

**Pendências e limites:**

- Faltam parsers de inventário (ODS/XLSX, escolher versão canônica), Expectativa, diária média,
  controle de pesquisas e BI; cada um exige inspeção e fixture próprias.
- Mapeamento, limites e regras de escala dependem de aprovação do OTO; a planilha oficial é um
  esqueleto sem respostas e não foi usada como prova de dados reais.
- Datas seriais e `date1904` ainda não são tratadas (a fonte atual não tem datas de entrada).
- Armazenamento do original em `bytea` no PostgreSQL; revisar se o volume exigir armazenamento
  de objetos.
- Leitura síncrona na requisição (arquivos pequenos); mover para fila se o acervo crescer.

**Próximo passo:** parte 09 (conciliação de nomes com empreendimentos, escolha do período
oficial, confirmação e persistência como respostas) usando `importacao_linha` e `canonico`.
