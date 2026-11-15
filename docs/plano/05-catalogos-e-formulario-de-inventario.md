# 05 — Catálogos e formulário canônico de inventário

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF03 e RF22; RNF01, RNF08, RNF11 e RNF12.

**Dependências:** [01](01-contrato-de-dados-e-regras.md), [03](03-perfis-permissoes-e-visibilidade.md), [07](07-auditoria-de-alteracoes.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Inventário oficial](../planilhas/inventario-oficial-olimpia/README.md).

Usar os cabeçalhos de serviços, equipamentos e acessibilidade como base dos catálogos; validar seleção, obrigatoriedade e legendas sem inventar opções.

## Objetivo

Representar as características de hospedagem em um formulário aprovado, reutilizável e simples.

## Trabalho previsto

- Mapear `Segmento`, `CatalogoGrupo` e `CatalogoItem` para as perguntas reais do inventário.
- Definir campos fixos e grupos de seleção; preservar chaves estáveis, rótulos e ordenação.
- Validar seleção única/múltipla, opção exclusiva (por exemplo, não possui), opção outro,
  texto de detalhe e quantidade. Não permitir combinações contraditórias.
- Disponibilizar carga inicial autorizada dos catálogos e gestão restrita de alterações.
- Inativar itens usados historicamente em vez de removê-los. Definir versionamento ou
  snapshot dos rótulos/regras antes de permitir edição que afete interpretação histórica.
- Manter o primeiro formulário específico de hospedagem; outros segmentos usam a mesma
  infraestrutura quando seus instrumentos de coleta forem fornecidos e aprovados.

## Frontend

Agrupar perguntas na sequência validada com OTO, sinalizar obrigatoriedade por contexto,
explicar unidades e oferecer zero/não se aplica/desconhecido conforme o contrato.
Garantir teclado, rótulos acessíveis, erros junto ao campo e adaptação a telas pequenas.

## Dados e API

Expor apenas catálogos ativos para novas respostas, preservando os valores históricos.
A validação servidor deve ser compartilhada com o inventário e a importação; não depender
de controles visuais. As mudanças de catálogo devem ser auditadas e versionadas.

## Critérios de aceite e testes

- Formulário corresponde campo a campo ao instrumento aprovado na parte 00.
- Item exclusivo não pode ser combinado com outra opção incompatível.
- Outro exige detalhe quando aplicável; campo desconhecido não é convertido em resposta negativa.
- Inativar um item não apaga nem muda a leitura de inventários anteriores.
- Uma pessoa consegue preencher e corrigir o formulário sem depender apenas de cor ou mouse.
