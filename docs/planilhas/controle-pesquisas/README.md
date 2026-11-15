# Controle operacional de pesquisas

## Arquivos de referência

- [CONTROLE PESQUISAS - Copia.ods](<CONTROLE PESQUISAS - Copia.ods>)

Origem: `Planilhas-20261115T021841Z-1-001.zip`, fornecido pelo usuário como
esqueletos das planilhas utilizadas pelo OTO. As cópias mantêm os bytes dos arquivos
originais; o nome foi apenas decodificado corretamente a partir do ZIP. Não foram
preenchidas, recalculadas nem alteradas as planilhas.

## O que representa

Acompanhamento operacional das pesquisas: edições, datas e revisões, identificação dos
meios de hospedagem, aceitação de participação, contatos e controle de respondentes.
Não é a fonte dos percentuais de ocupação respondidos.

## Abas utilizadas

- `2026` e `2025`: identificação e acompanhamento das edições das pesquisas.
- `Controle MH 2026` e `Controle MH 2025`: estrutura de participantes e acompanhamento
  das respostas de hospedagens às diferentes edições.

## Como será usada no projeto

Orientar as telas de gestão de pesquisas, seleção de participantes e acompanhamento de
respondentes/pendentes. Na nova aplicação, esses controles devem ser derivados dos vínculos,
da elegibilidade e das respostas registradas, evitando outra planilha mantida manualmente.

Uma carga de metadados legados pode ser planejada após definir códigos das edições e
identidades dos empreendimentos. Marcações de participação não substituem uma resposta
nem autorizam fabricar percentuais de ocupação.

No MER, relaciona-se a `empreendimento`, `contato`, `pesquisa`, `periodo` e `resposta`.
Elegibilidade, convites e preferências podem exigir evolução do modelo, conforme o plano.

## Decisões e limites

- Existem rótulos de edições que combinam Consolidado de um período e Expectativa de outro.
  O MER atual tem um único `tipo_coleta` por pesquisa; definir separação em pesquisas
  relacionadas ou ajuste de modelagem sem perder a identificação da edição original.
- Confirmar significado das marcações, revisões, aceitação de participação e público elegível.
- Aceitar participar de pesquisas não equivale a optar por receber boletim.
- Os contatos não devem virar contas de acesso automaticamente. Contas são individuais
  e seus vínculos precisam de uma regra própria de provisionamento.

## Integridade das cópias

SHA-256 dos arquivos recebidos:

- `CONTROLE PESQUISAS - Copia.ods`: `64b1163b8717304f0ca71ee477968171e73d141f1146f694a0debdf9b0f32c20`
