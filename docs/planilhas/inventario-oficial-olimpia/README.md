# Inventário Oficial de Olímpia

## Arquivos de referência

- [INVENTARIO OFICIAL OLIMPIA.ods](<INVENTARIO OFICIAL OLIMPIA.ods>)
- [INVENTARIO OFICIAL OLIMPIA.xlsx](<INVENTARIO OFICIAL OLIMPIA.xlsx>)

Origem: `Planilhas-20261115T021841Z-1-001.zip`, fornecido pelo usuário como
esqueletos das planilhas utilizadas pelo OTO. As cópias mantêm os bytes dos arquivos
originais; o nome foi apenas decodificado corretamente a partir do ZIP. Não foram
preenchidas, recalculadas nem alteradas as planilhas.

## O que representa

Cadastro da oferta turística de Olímpia: estabelecimentos, segmentos, contatos,
infraestrutura, capacidade, situação de Cadastur e registros de hospedagem caseira (RHC).
O arquivo contém muitos segmentos além dos meios de hospedagem; o projeto utilizará
somente o recorte necessário à vertical hoteleira.

## Abas e recortes utilizados

- `MEIOS DE HOSPEDAGEM`: cadastro, tipo de hospedagem, contatos, Cadastur, funcionários,
  UH, leitos, UH acessíveis, horários, serviços, equipamentos e acessibilidade.
- `RHC`: referência para quantidade e leitos de hospedagem caseira. O destino previsto
  é agregado por período; não é necessário importar o cadastro pessoal dos proprietários.
- `DADOS CONSOLIDADOS`: conferência dos totais de hospedagens, UH, leitos e RHC;
  são resultados derivados, não uma segunda fonte para somar aos registros individuais.
- `CADASTUR`: referência dos resumos de regularização; os dados por estabelecimento
  devem ser conciliados com a aba de hospedagem.
- `MH IRREGULAR🚫️`: usar apenas depois de definir com OTO sua inclusão nos indicadores.
  Não misturar automaticamente hospedagens regulares e irregulares.

Os nomes acima são apresentados sem espaços finais; o parser deve reconhecer os nomes
reais das abas. Os demais segmentos, pesquisas de fornecedores e controles de ODS não
entram automaticamente no escopo.

## Como será usada no projeto

Orientar o formulário canônico de inventário, os catálogos de infraestrutura e o primeiro
importador. Alimentar cadastro e versões de capacidade, que depois serão consultados
pelos cálculos de ocupação e fluxo. Alteração de capacidade precisa de vigência e histórico.

No MER, corresponde a `empreendimento`, `segmento`, `empreendimento_segmento`, `contato`,
`cadastur`, `catalogo_grupo`, `catalogo_item`, `inventario_versao`, `inventario_item` e,
para os agregados de hospedagem caseira, `rhc_periodo`.

## Decisões e limites

- ODS e XLSX são representações da mesma fonte. Escolher a versão canônica com o OTO;
  não importar ambas como cadastros independentes. Existem diferenças de nomes de abas
  e de algumas células entre os arquivos; equivalência integral não foi homologada.
- Definir chave de conciliação entre fontes; não pressupor unicidade de CNPJ nem de nome.
- Regularidade cadastral não equivale a ativo/encerrado ou a simplesmente possuir Cadastur.
- Confirmar categoria do indicador, significado das legendas, obrigatoriedade e datas de referência.
- Os esqueletos orientam a estrutura. Testes de preenchimento usarão registros fictícios,
  preservando a distinção entre zero, não informado e não se aplica.

## Integridade das cópias

SHA-256 dos arquivos recebidos:

- `INVENTARIO OFICIAL OLIMPIA.ods`: `1f2cdd4084cbf95e99ed4025aa1ad73249f51c750e52e9e5f7c7fd2a772d2b88`
- `INVENTARIO OFICIAL OLIMPIA.xlsx`: `f569f99af9d7bb6b5ba5cb25e616817463ca84e94dbdb7b451b8e6a66a6b854e`
