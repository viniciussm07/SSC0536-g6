# 09 — Importação: validação, conciliação e persistência

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF04–RF08 e RF35; RNF09 e RNF10.

**Dependências:** [04](04-cadastro-de-empreendimentos.md), [06](06-inventario-versionado.md), [07](07-auditoria-de-alteracoes.md), [08](08-importacao-upload-leitura-e-parse.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).
- [Tabulação Consolidado](../planilhas/tabulacao-consolidadas-2026/README.md).
- [Tabulação Expectativa](../planilhas/tabulacao-expectativa-2026/README.md).
- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).
- [Pesquisa de diária média](../planilhas/pesquisa-diaria-media-meios-hospedagem/README.md).

Validar conciliação com códigos fictícios consistentes entre arquivos. Distinguir entradas, controles e totais derivados para evitar dupla contagem.

## Objetivo

Incorporar dados aprovados à base central sem duplicidade, perda de histórico ou transcrição manual.

## Backend e dados

- Aplicar validação de domínio sobre as linhas canônicas; separar válida, inválida e pendente
  de conciliação, preservando erro e origem. Lotes de respostas também dependem das partes 10–13.
- Conciliar IDs legados, empreendimentos e períodos com critérios aprovados. CNPJ/nome isolados
  não autorizam fusão automática. Guardar decisões manuais e sua reutilização em futuros lotes.
- Definir política de criação/atualização, conflito entre fontes e entre alteração manual/importada,
  registros ausentes no arquivo e possibilidade de importação parcial. Ausência não significa exclusão.
- Exibir plano de alterações antes da confirmação: novos, atualizados, sem mudança, rejeitados e conflitos.
- Implementar idempotência por fonte, versão/checksum e identidade do registro; tratar nova versão
  do mesmo arquivo e correções sem duplicar respostas ou versões do inventário.
- Persistir por transação/unidade de lote aprovada; gravar auditoria e proveniência e marcar
  necessidade de recálculo. Não publicar indicadores com dados pendentes.
- Definir estados, reprocessamento, retomada e compensação de lotes. Preservar trabalhos confirmados
  e não prometer desfazer importações com exclusões que apaguem alterações posteriores.

## Frontend

Tela de conferência e resolução de correspondências, seleção explícita de conflitos,
confirmação com totais, consulta do resultado e download autorizado de rejeições.
Exibir falha parcial quando essa política for permitida, nunca sucesso integral enganoso.

## Critérios de aceite e testes

- Reimportar a mesma fonte não duplica empreendimentos, respostas ou inventários.
- Ambiguidade não associa dados ao estabelecimento errado; exige decisão autorizada.
- Linhas aprovadas preservam origem, regra aplicada e responsável pela confirmação.
- Falha de persistência não deixa transação incompleta nem lote marcado como finalizado indevidamente.
- Totais de lidas, aceitas, inalteradas, rejeitadas e pendentes reconciliam com o arquivo.
- Alteração retroativa segue as regras de versão e recálculo, sem sobrescrever publicação histórica.
