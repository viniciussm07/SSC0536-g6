# Dicionário inicial de hospedagem

Versão técnica 1; origem: os dois arquivos do
[inventário](../planilhas/inventario-oficial-olimpia/README.md), inspecionados em leitura
em 15/11/2026. A aba real é `MEIOS DE HOSPEDAGEM `, **com espaço final**. Cabeçalhos na
linha 5, grupos na linha 4 e grupos de acessibilidade na linha 2. As coordenadas abaixo
são dos cabeçalhos, não de registros pessoais. ODS e XLSX concordam nesses cabeçalhos
essenciais, com diferenças de espaços/quebras de linha. Isso não comprova equivalência
de conteúdo nem define a versão canônica para importação.

Os nomes são candidatos canônicos camelCase. O destino indica campo do cliente Prisma,
nunca nome público snake_case. `?` significa opcional no MER, não homologação de
obrigatoriedade no formulário. Para entradas opcionais, preservar os estados do
[contrato](README.md); `null` no banco não preserva todos eles.

## Cadastro

| Origem                                    | Nome canônico → destino                                         | Tipo, domínio e unidade                                 | Obrigatoriedade por contexto                                      | Exemplo fictício e validação                                         |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Decisão MER                               | `empreendimentoId` → `Empreendimento.id`                        | inteiro positivo, gerado                                | saída/associação; criação não recebe ID arbitrário                | `900001`; sessão deve autorizar o recurso                            |
| C5, NOME FANTASIA                         | `nomeFantasia` → `Empreendimento.nomeFantasia`                  | texto                                                   | criação exige valor informado; atualização parcial admite omissão | `Hotel Fictício Alfa`; texto sem espaços externos (C01)              |
| W5, RAZÃO SOCIAL                          | `razaoSocial` → `Empreendimento.razaoSocial?`                   | texto                                                   | opcional técnico                                                  | `Hospedagem Fictícia Alfa Ltda.`                                     |
| Sem cabeçalho confirmado no recorte       | `cnpj` → `Empreendimento.cnpj?`                                 | identificador textual                                   | opcional, sem unicidade aprovada                                  | ausente; não preencher a coluna X vazia por suposição                |
| B5, QTD.                                  | `referenciaLinha` → proveniência futura                         | contador de planilha, não ID estável                    | somente conferência                                               | `1`; não usar como `idOrigem` sem confirmação                        |
| Metadado de origem, não coluna confirmada | `idOrigem` → `Empreendimento.idOrigem?`                         | texto com namespace da fonte                            | conciliação quando disponível                                     | `fixture:alfa`; nome/CNPJ não substituem ID                          |
| V5, TIPO                                  | `tipoHospedagem` → `Empreendimento.tipoHospedagem?`             | rótulo textual legado                                   | opcional técnico; catálogo pendente                               | `HOTEL`; preservar rótulo, não inferir categoria                     |
| Decisão de enquadramento                  | `categoriaIndicador` → `Empreendimento.categoriaIndicador?`     | categoria metodológica                                  | pendente de tabela aprovada                                       | desconhecido; não converter FLAT em hotel automaticamente            |
| Y5, DATA ABERTURA                         | `dataInicioAtividades` → `Empreendimento.dataInicioAtividades?` | data civil                                              | opcional técnico                                                  | `2026-01-01`; data ISO existente (C10)                               |
| AA5, ENDEREÇO                             | `endereco` → `Empreendimento.endereco?`                         | texto                                                   | opcional técnico                                                  | `Rua Fictícia, 100`                                                  |
| AB5, BAIRRO; AE5, REGIÃO                  | `bairro`, `regiao` → sem campo próprio                          | texto                                                   | suspensos para persistência                                       | `Bairro Exemplo`; não concatenar silenciosamente no endereço         |
| AC5, LOCALIZAÇÃO                          | `zona` → `Empreendimento.zona?`                                 | `urbana` ou `rural` no MER                              | legenda da fonte pendente                                         | `urbana`; não geocodificar texto automaticamente                     |
| AD5, COORDENADAS GEOGRÁFICAS              | `localizacao` → PostGIS geography opcional                      | longitude [-180,180], latitude [-90,90], WGS84 proposto | opcional, confirmar formato/eixos da origem                       | longitude `-49.00`, latitude `-20.00`; SQL parametrizado na parte 04 |
| Decisão operacional, não Cadastur         | `situacao` → `Empreendimento.situacao`                          | `ativo` ou `encerrado`                                  | criação/conferência exigem decisão autorizada                     | `ativo`; ausência de resposta não encerra cadastro                   |
| Decisão operacional                       | `dataEncerramento` → `Empreendimento.dataEncerramento?`         | data civil                                              | política de encerramento pendente                                 | `2026-09-30`; preservar respostas e inventários                      |
| Recorte de produto/MER                    | `segmentoId` → `EmpreendimentoSegmento`                         | associação a catálogo                                   | cadastro de hospedagem vincula segmento autorizado                | referência ao segmento fictício `900001`                             |

## Contatos e Cadastur

Contatos legados não são usuários nem credenciais. Não importar pessoas remanescentes
para demonstrações. Finalidade pública/interna exige confirmação por tipo de contato.

| Origem                                      | Nome canônico → destino                               | Tipo/domínio                                   | Obrigatoriedade por contexto                              | Exemplo/validação                                                              |
| ------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| E5 CONTATO; Z5 PROPRIETÁRIO(S)              | `responsavelNome` → `Contato.responsavelNome?`        | texto, dado pessoal                            | opcional; Z não vira conta nem vínculo automaticamente    | `Pessoa Fictícia`; cargo sem fonte confirmada                                  |
| G5 TELEFONE PESQUISAS                       | `contatos[].valor` → `Contato.valor`, tipo `telefone` | texto                                          | valor/tipo/finalidade obrigatórios se contato for gravado | telefone fictício só em fixture própria; preservar ramal/DDI                   |
| H5 EMAIL PESQUISAS                          | idem, tipo `email`                                    | texto                                          | idem; finalidade sugerida interna, a confirmar            | `pesquisas@example.test`; validação de e-mail no DTO futuro                    |
| AG5 TELEFONE COMERCIAL; AH5 EMAIL COMERCIAL | idem, tipos telefone/email                            | texto                                          | idem; divulgação não presumida                            | `comercial@example.test`                                                       |
| AI5 SITE                                    | idem, tipo `site`                                     | URL                                            | contato opcional                                          | `https://example.test`; protocolos permitidos na parte 04                      |
| AJ5 FACEBOOK; AK5 INSTAGRAM                 | idem, tipo `rede_social`                              | texto/URL                                      | contato opcional                                          | `https://example.test/perfil`; plataforma/proveniência ainda sem campo próprio |
| AM5, obrigação 1/2/3                        | `obrigatoriedadeCadastur` → sem campo                 | domínio legado obrigatório/opcional/não consta | conferência pendente                                      | não converter `3` em `nao_possui`                                              |
| AN5, CADASTUR 1=SIM 0=NÃO                   | `possuiCadastur` → candidato para `Cadastur.situacao` | booleano com legenda explícita                 | conferir com AO/AP antes de gravar                        | `0` → falso; `1` não define `igual_cnpj`                                       |
| AO5 NÚMERO CADASTRO                         | `numero` → `Cadastur.numero?`                         | identificador textual, manter zeros            | coerência depende da situação                             | `000123-FICTICIO`; não converter em número                                     |
| AP5 VENCIMENTO                              | `vencimento` → `Cadastur.vencimento?`                 | data civil                                     | opcional técnico                                          | `2027-01-31`                                                                   |
| Decisão MER + conferência AN/AO             | `situacaoCadastur` → `Cadastur.situacao`              | `nao_possui`, `igual_cnpj`, `numero_proprio`   | obrigatório ao criar registro Cadastur                    | `nao_possui`; não equivale a regularidade ou encerramento                      |

## Capacidade e funcionamento

| Origem                                               | Nome canônico → `InventarioVersao` | Tipo/unidade                      | Obrigatoriedade por contexto                              | Exemplo/validação                                                  |
| ---------------------------------------------------- | ---------------------------------- | --------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| AQ5 FUNC. FIXOS                                      | `funcFixos?`                       | inteiro, pessoas                  | opcional técnico                                          | `4`; quantidade não negativa                                       |
| AR5 FUNC. TEMP                                       | `funcTemporarios?`                 | inteiro, pessoas                  | opcional técnico                                          | `0`, vazio e desconhecido distintos (C06)                          |
| AS5 UH´S                                             | `totalUh?`                         | inteiro, unidades habitacionais   | opcional técnico; conferência completa a definir          | `10` (C02)                                                         |
| AT5 LEITOS                                           | `leitos?`                          | inteiro, leitos                   | idem                                                      | `20` ou zero informado (C03)                                       |
| AU5 UH´S PCD                                         | `uhsPcd?`                          | inteiro, UH acessíveis            | idem                                                      | desconhecido ou não se aplica (C07/C08); admissibilidade pendente  |
| Sem coluna inequívoca; tabulação MH!G1 sugere máximo | `maxLeitosPorUh?`                  | inteiro, leitos/UH                | suspenso para associação automática                       | `4` apenas em fixture; confirmar significado de MH!G               |
| AV5 Funcionamento 24hs                               | `funciona24h?`                     | booleano                          | legenda de preenchimento pendente                         | `false` no contrato; não interpretar X automaticamente             |
| AW5 HORÁRIO CHECK IN CHECK OUT                       | `checkin?`, `checkout?`            | horário civil HH:mm               | separação de campo combinado depende do layout preenchido | `14:00`, `11:00` (C11 após adaptação); nunca inferir 24h           |
| Sessão autenticada                                   | `criadaPor` → relação com Usuario  | ID positivo                       | obrigatório na criação; não confiável no payload          | usuário fictício `900005`, depois de autorizado                    |
| Conferência operacional                              | `vigenciaInicio`, `vigenciaFim?`   | datas civis                       | início obrigatório; convenção de intervalo pendente       | `2026-01-01`; não usar data de upload como início efetivo          |
| Decisão operacional                                  | `tipoAlteracao`                    | `correcao` ou `mudanca_real`      | obrigatório na criação da versão                          | `mudanca_real`; efeito histórico definido na parte 06              |
| Conferência operacional                              | `situacaoConferencia`              | `completo`, `parcial`, `pendente` | obrigatório na criação da versão                          | `parcial`; não definir completo pela mera ausência de erro de tipo |

Quantidades usam `normalizarQuantidadeColetada`, datas `normalizarDataColetada`, horários
`normalizarHorarioColetado`. Nenhuma relação entre UH, leitos e funcionários é presumida
como metodologia. A versão de capacidade integra o histórico, não o cadastro central.

## Escolhas, quantidades e texto dos catálogos

Cada coluna de opção usa sua coordenada e os cabeçalhos superiores como identidade de
mapeamento. Rótulos repetidos como “Não”, “Outros” e “Sanitário PCD” não são chaves globais.
A definição por coluna deve ser versionada na parte 05 antes de aceitar um parser.

| Colunas, linha 5                  | Grupo observado                                                   | Destino candidato e domínio                                            |
| --------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| AX:AY                             | Reservas; formas de pagamento                                     | `CatalogoGrupo`/`CatalogoItem`; confirmar separadores/múltipla escolha |
| AZ:BD                             | Geral (estacionamento, manobrista, mensageiro, fumantes, pet)     | `InventarioItem`; não presumir quantidade a partir de marca            |
| BE:BG                             | Língua estrangeira                                                | opções inglês/espanhol/outra; detalhe de outra preservado              |
| BH:BM                             | UH                                                                | internet/ar condicionado/ventilador/frigobar/TV/outros                 |
| BN:BU                             | Recepção                                                          | “Não” candidato exclusivo; demais opções/detalhes                      |
| BV:CL                             | A&B                                                               | “Não”, regimes e serviços; exclusividade/regime pendentes              |
| CM:CT                             | Eventos                                                           | “Não”, equipamentos, sanitários e outros                               |
| CU:DL                             | Recreação                                                         | “Não”, piscinas, quadras, lazer e outros                               |
| DM:DN                             | Facilidade para PCD                                               | não/sim; regra de dependência das questões seguintes pendente          |
| DO:DT                             | Pessoal capacitado                                                | não/física/auditiva/visual/intelectual/múltipla                        |
| DU:EC; ED:EH; EI:EN; EO:ES        | Rota externa; embarque; vaga; circulação interna                  | subgrupos próprios, sem fundir rótulos                                 |
| ET:EZ; FA:FF; FG:FJ; FK:FQ        | Escada; rampa; piso; elevador                                     | idem                                                                   |
| FR:FS; FT:GA; GB:GC; GD:GG        | Equipamento motorizado; sinalização visual; alarme; comunicação   | idem                                                                   |
| GH:GJ; GK:GM; GN:GX; GY:HA; HB:HC | Balcão; mobiliário; sanitário; telefone; atendimento preferencial | idem                                                                   |

Nome canônico dos itens: `itens[].itemId` (associação a `CatalogoItem`), `estado` (`sim`,
`nao`, `nao_se_aplica`, `nao_informado` no MER), `quantidade?` (inteiro ≥0), `detalhe?`
(texto). Obrigatórios ao persistir: versão, item e estado. Quantidade não é booleano;
`sim` com quantidade zero exige conferência da pergunta, sem correção automática.
Exemplo fictício: item `fixture.estacionamento`, estado `sim`, quantidade `0`.
Os estados de entrada anteriores à persistência seguem o contrato e podem exigir evolução.

## Campos sem correspondência e exclusões do primeiro recorte

A5 (filtro destinos inteligentes), D5 (PDDT), I:U (ODS), AF5 (inventário) e AL5 (CNAE)
não têm semântica/campo completo homologado no MER. F5 (aceitação de pesquisas) tem
legenda booleana, mas não destino de preferência/elegibilidade pronto. Registrar para
conferência futura, sem descarte silencioso em importação e sem transformar em consentimento
de boletim, conta, privilégio de acesso ou critério universal de pesquisa.

`RHC!A5` (quantidade) e `RHC!T5` (leitos) orientam `RhcPeriodo.qtdRhc/leitos` após definir
contagem, deduplicação e período. `RHC!U5` (capacidade máxima) não é equivalente confirmado
a T. Proprietário, CPF, endereço e contatos pessoais do RHC ficam fora do contrato de
carga: somente agregado autorizado por período na parte 17. Resumos CADASTUR e DADOS
CONSOLIDADOS são conferência derivada; não somar novamente como empreendimentos.
