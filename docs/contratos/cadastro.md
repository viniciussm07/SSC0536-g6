# Cadastro de empreendimentos — POC

Implementação técnica da [parte 04](../plano/04-cadastro-de-empreendimentos.md): cadastro,
consulta e atualização de meios de hospedagem com contatos, Cadastur, segmentos,
geolocalização opcional, resolução de duplicidade e auditoria atômica. Campos e rotas
seguem o [dicionário](dicionario-inventario.md) e o [contrato de acesso](acesso.md). As
decisões abaixo são **técnicas da POC**; a homologação pelo OTO continua pendente
(R07, R08 e R09 em [regras-e-evolucao](regras-e-evolucao.md)).

## Endpoints

Todos sob `/api`, autenticados, com `{ "data": ... }` e erros `{ "error": { code, message,
details? } }`. Datas sem hora são `YYYY-MM-DD`. Campos ausentes de um cadastro parcial são
`null` (nunca zero ou vazio). Escrita exige `Origin` configurado, JSON e `X-OTO-Request: 1`.

| Método e caminho                    | Permissão                        | Descrição                                                                             |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| GET `/empreendimentos`              | `empreendimentos:consultar`      | Listagem paginada (`EmpreendimentoListado`); ordena por nome e ID. Ignora o contexto. |
| GET `/empreendimentos/:id`          | `empreendimentos:consultar`      | `EmpreendimentoDetalhe`; exige `x-identification` igual a `:id`.                      |
| GET `/empreendimentos/:id/contatos` | `empreendimentos:consultar`      | Coleção OData dos contatos; exige o mesmo contexto e escopo do detalhe.               |
| GET `/empreendimentos/:id/cadastur` | `empreendimentos:consultar`      | Coleção OData dos registros Cadastur; exige o mesmo contexto e escopo do detalhe.     |
| POST `/empreendimentos`             | `empreendimentos:criar` (global) | Cria; 201 com o detalhe. Empresário não cria.                                         |
| PUT `/empreendimentos/:id`          | `empreendimentos:alterar`        | Atualização parcial; exige `x-identification` igual a `:id`.                          |
| GET `/segmentos`                    | `empreendimentos:consultar`      | Catálogo de segmentos (`id`, `chave`, `nome`, `nivelCadastro`) para o formulário.     |

As três coleções seguem o [subconjunto OData](odata.md). Os filtros antigos (`busca`, `situacao`,
`tipoHospedagem`, `incompleto`) e `page/pageSize` foram removidos e retornam 400; use `$filter`
(`contains(identificacao,'...')`, `situacao eq 'ativo'`, `pendencia in (...)`) e `$top/$skip`.

Não há exclusão: encerrar um empreendimento é mudar a situação (inventários e respostas
anteriores permanecem). A localização é lida e gravada por SQL parametrizado PostGIS em
WGS84 (SRID 4326), com `longitude` em [-180, 180] e `latitude` em [-90, 90].

## Entrada

`POST` exige `nomeFantasia`, `situacao` e ao menos um `segmentoIds`; o resto é opcional, o
que permite **cadastro parcial** sem CNPJ. No `PUT` todo campo é opcional:

- **omitido** = não altera; **`null`** = limpa (campos opcionais); **texto vazio** = erro;
- `contatos` e `cadastur` são o **conjunto desejado**: item com `id` atualiza, sem `id`
  cria, o que faltar é removido; `id` de outro empreendimento retorna 400;
- campos desconhecidos (inclusive `usuarioId`) retornam 400: **a autoria vem da sessão**.

Regras validadas no servidor com o validador portável do `common` (`validarEntradaEmpreendimento`,
reaproveitado pelo formulário só para orientar):

| Campo                | Regra                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nomeFantasia`       | 1–200 caracteres, aparado. Nome não é chave.                                                                                                           |
| `cnpj`               | Opcional; 14 dígitos (máscara aceita e removida). Sem unicidade e sem conferência de dígitos (R01).                                                    |
| `situacao`           | `ativo` ou `encerrado`; `encerrado` exige `dataEncerramento`; `ativo` não tem. Reativar envia `null`.                                                  |
| datas                | Data civil existente; encerramento não anterior ao início das atividades.                                                                              |
| `zona`               | `urbana` ou `rural`.                                                                                                                                   |
| `contatos[]`         | `tipo` (`telefone`, `email`, `site`, `rede_social`), `finalidade` (`publico`, `interno`), valor por tipo (e-mail válido, site `http(s)://`). Até 20.   |
| `cadastur[]`         | `nao_possui` (sem número/vencimento), `numero_proprio` (exige número, texto com zeros), `igual_cnpj` (exige CNPJ cadastrado, sem outro número). Até 5. |
| `categoriaIndicador` | Informada pela equipe; **nunca inferida** do tipo de hospedagem (R08).                                                                                 |

## Duplicidade

Antes de criar (ou ao mudar nome, CNPJ ou ID de origem) o servidor procura candidatos com o
**mesmo CNPJ**, o **mesmo ID de origem** ou o **mesmo nome normalizado** (sem acentos, caixa
e pontuação). Havendo candidatos, responde 409 `DUPLICIDADE_POTENCIAL` com `details`
(`id`, `nomeFantasia`, `cnpj`, `situacao`, `motivos`). Quem tem permissão confirma enviando
`confirmarSemDuplicidade: true`; os IDs confirmados ficam na auditoria. Nomes apenas
parecidos ("Alfa" e "Alfa II") **não** bloqueiam e nada é fundido automaticamente.

## Escopo e autoria

| Quem                              | Pode                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Administrador, gestor, estagiário | Criar e alterar qualquer cadastro.                                                                                         |
| Empresário                        | Alterar só o próprio vínculo ativo: razão social, endereço, zona, localização, início das atividades, contatos e Cadastur. |
| Visualizador                      | Nada do cadastro.                                                                                                          |

Campos reservados à equipe (`nomeFantasia`, `cnpj`, `idOrigem`, `tipoHospedagem`,
`categoriaIndicador`, `situacao`, `dataEncerramento`, `segmentoIds`) enviados por quem tem
escopo `vinculados` retornam 403 `CAMPO_RESTRITO`. Empreendimento fora do vínculo retorna 404
antes de qualquer comparação com o contexto (ver [contexto de entidade](acesso.md)).
Contatos `interno` só trafegam em endpoints autenticados e com escopo; não existe visão
pública de cadastro.

## Auditoria e concorrência

Cada criação ou alteração grava, **na mesma transação**, uma linha em `auditoria`
(`entidade: "empreendimento"`, `usuarioId` da sessão, `antes` e `depois` apenas com os
campos que mudaram; contatos, Cadastur e segmentos como listas completas). Uma atualização
sem mudança real não gera auditoria. Edições concorrentes do mesmo cadastro são serializadas
(`SELECT … FOR UPDATE`), e a sessão e a permissão são revalidadas dentro da transação.
A tela de histórico e a consulta de auditoria pertencem à parte 07.

## Informações faltantes

`pendencias` lista, sem bloquear nada: `sem_cnpj`, `sem_razao_social`, `sem_tipo_hospedagem`,
`sem_categoria_indicador`, `sem_endereco`, `sem_segmento`, `sem_contato` e `sem_cadastur`
(Cadastur não informado é diferente de `nao_possui`). Localização não é cobrada: o cadastro
não depende de mapa ou geocodificação. Capacidade (UH e leitos) pertence às versões de
inventário da parte 06, não ao cadastro.

## Fora desta entrega

Importação de planilhas e conciliação entre fontes (partes 08–09), tela de histórico
(parte 07), regularidade cadastral, bairro e região (sem campo no MER; R07), tabela
aprovada de tipo→categoria (R08) e exclusão definitiva.

## Grade de inventário e referência visual v5

A listagem de empreendimentos também devolve `zona`, `endereco`, `leitos`, `totalUh`,
`funcFixos` e `funcTemporarios`. Os quatro campos numéricos vêm exclusivamente da
versão não substituída vigente hoje em `America/Sao_Paulo`, com fim inclusivo. Sem
versão vigente ou sem permissão de consulta de inventários no empreendimento, são
`null`; zero informado permanece zero. Os campos são opcionais no validador para
compatibilidade aditiva com respostas anteriores, mas o backend atualizado os envia.

Todos aceitam filtros OData. Zona/endereço também aceitam ordenação; capacidade e
funcionários são projeções filtráveis, sem ordenação. Filtros de capacidade respeitam
o mesmo escopo de consulta de inventários, inclusive comparações com null e negações.
O CSV inclui esses campos, mantendo fixos e temporários em colunas distintas.

A grade mantém uma informação por célula: Empreendimento, Identificação, Segmento,
Zona, Endereço, Leitos, UH, Funcionários, Situação, Pendências cadastrais e Ações.
Identificação apresenta o CNPJ formatado ou, na ausência dele, o ID, sem prefixos.
Pendências cadastrais mostra somente a quantidade, inclusive zero, com os motivos no
texto de ajuda e filtro pelas informações pendentes. Zona e endereço têm colunas e
filtros próprios; não é deduzido bairro, pois não existe esse campo no modelo.
“Segmento” apresenta o tipo de hospedagem (Hotel/Pousada/etc.), conforme a referência
visual; não altera os vínculos de segmentos do cadastro.

Funcionários mostra somente `funcFixos + funcTemporarios` quando ambos são conhecidos.
Quando falta uma parcela, mostra “Não informado”; não soma dados parciais nem apresenta
o detalhamento das parcelas na célula. Os filtros continuam explicitamente por fixos
e temporários, sem apresentar as quantidades separadas na grade.
Situação cadastral e pendências continuam distintas. Os rótulos de atualização do
protótipo não são usados para inventar prazos ou critérios de desatualização.
