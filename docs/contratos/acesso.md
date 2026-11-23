# Acesso por perfil, vínculo e indicador — POC

A matriz abaixo foi confirmada pelo desenvolvedor para a POC. Homologação do OTO
permanece pendente. As fontes de inventário e controle de pesquisas contextualizam
o domínio; contatos legados não geram contas nem permissões.

| Perfil        | Concessões iniciais                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| administrador | Gerenciar contas, vínculos, permissões, visibilidade e catálogos do inventário; operar os recursos do gestor; consultar auditoria.                             |
| gestor        | Consultar, criar, alterar e exportar cadastro, inventários, pesquisas, respostas, importações e cálculos; consultar/exportar indicadores liberados e publicar. |
| estagiario    | Consultar/criar/alterar cadastro, inventários e respostas; consultar pesquisas; sem publicação.                                                                |
| visualizador  | Consultar indicadores explicitamente liberados para o perfil.                                                                                                  |
| empresario    | Consultar/alterar seus empreendimentos; consultar/criar/alterar seus inventários e respostas, sempre por vínculo ativo.                                        |

As permissões são configurações, não implementação antecipada dos fluxos dos planos
04–18. Nesta parte existem gestão de acesso, consultas de resumos e exportações
protegidas. Escrita cadastral, inventário completo e preenchimento de respostas
serão implementados nos respectivos planos usando a política central.

## Política e persistência

`common/src/acesso` publica recursos, ações, escopos, matriz inicial, contratos e
validadores portáveis. `AutorizacaoService` aplica a decisão no servidor. O guard
global exige sessão e política explícita; ausência de regra, perfil desconhecido,
regra incompatível ou escopo `nenhum` negam acesso. Não há bypass por administrador.
Saúde e os endpoints de autenticação preservam suas verificações próprias.

Migration `20261117000000_permissoes` acrescenta `PermissaoPerfil`,
`VisibilidadeIndicadorPerfil` e o contador `PoliticaAcesso`, sem alterar históricos
ou credenciais. A matriz inicial é inserida uma única vez pela migration; seed não
sobrescreve configurações. Ausência de visibilidade significa restrito, **inclusive
para administrador**. Não há consulta pública de dados de negócio nesta etapa.

Escopos: `todos` permite o conjunto do recurso; `vinculados` exige vínculo ativo e
usuário ativo no filtro de empreendimento; `nenhum` nega. Empresário nunca recebe
escopo global nem gestão de acesso; visualizador só recebe consulta/exportação de
indicadores; estagiário não publica. Gestão de contas, vínculos, permissões,
visibilidade e auditoria permanece exclusiva do administrador. A configuração
preserva as permissões administrativas mínimas para impedir bloqueio de gestão.

Uma pessoa pode representar vários empreendimentos. A interface exige seleção
explícita e usa IDs estáveis; autorização não depende do ID informado na URL ou no
payload. Recurso fora do vínculo retorna 404, sem confirmar existência. Autoria de
mudanças vem da sessão. IDs de outro usuário em campos extras são rejeitados.

## Endpoints

Todos sob `/api`, autenticados, com sucesso `{ "data": ... }`. Coleções seguem o
[subconjunto OData](odata.md) (`$filter`, `$orderby`, `$top` padrão 20 e máximo 100, `$skip`,
`$count`), ordenação estável e `meta` com `top`, `skip` e, com `$count=true`, `total`.
Exportações retornam CSV integral do conjunto filtrado autorizado, aceitando apenas
`$filter` e `$orderby`. Veja [exportações CSV](exportacoes.md).

| Método e caminho                                                      | Entrada / saída principal                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/acessos/atual`                                                  | `usuarioId`, `perfil`, `revisao`, `permissoes`, `vinculos` ativos do próprio usuário (`empreendimentoId`, `nomeFantasia`, `cnpj`).                                                                                                                            |
| GET `/contas`                                                         | Resumos: `id`, `nome`, `email`, `perfil`, `ativo`.                                                                                                                                                                                                            |
| POST `/contas`                                                        | `{nome, email, perfil}` → 201 com `{usuarioId, token, expiraEm}`.                                                                                                                                                                                             |
| PUT `/contas/:id`                                                     | `{perfil, ativo}` → resumo da conta.                                                                                                                                                                                                                          |
| POST `/contas/:id/ativacoes`                                          | `{}` → 201 com novo código de ativação/recuperação.                                                                                                                                                                                                           |
| GET `/contas/:id/vinculos`                                            | Coleção OData: `empreendimentoId`, `nomeFantasia`, `ativo`.                                                                                                                                                                                                   |
| PUT `/contas/:id/vinculos/:empreendimentoId`                          | `{ativo}` → `{empreendimentoId, ativo}`.                                                                                                                                                                                                                      |
| GET `/perfis`                                                         | Catálogo dos cinco perfis.                                                                                                                                                                                                                                    |
| GET `/perfis/:perfil/permissoes`                                      | Coleção OData de `{recurso, acao, escopo}`.                                                                                                                                                                                                                   |
| PUT `/perfis/:perfil/permissoes`                                      | `{permissoes: [...]}` substitui a matriz do perfil; até 100 regras únicas. Retorna `{perfil, permissoes}`.                                                                                                                                                    |
| GET `/perfis/:perfil/visibilidades`                                   | Coleção OData: `indicadorId`, `nome`, `permitido`. Configuração ausente aparece como `false`; sem valores do indicador.                                                                                                                                       |
| PUT `/perfis/:perfil/visibilidades/:id`                               | `{permitido}` → `{perfil, indicadorId, permitido}`.                                                                                                                                                                                                           |
| GET `/empreendimentos`                                                | Listagem do cadastro e catálogo de seleção (ignora o contexto): `EmpreendimentoListado` (`id`, `nomeFantasia`, `cnpj`, `situacao`, `tipoHospedagem`, `pendencias`); filtros `busca`, `situacao`, `tipoHospedagem`, `incompleto`. Ver [cadastro](cadastro.md). |
| GET `/empreendimentos/:id`                                            | `EmpreendimentoDetalhe` (ver [cadastro](cadastro.md)); exige o cabeçalho de contexto igual a `:id`.                                                                                                                                                           |
| POST `/empreendimentos`, PUT `/empreendimentos/:id`, GET `/segmentos` | Escrita e catálogo do cadastro: ver [cadastro](cadastro.md).                                                                                                                                                                                                  |
| GET `/empreendimentos/:id/inventarios`                                | Resumos versionados (inclui substituídas): `id`, vigência, `totalUh`, `leitos`, `situacaoConferencia`, `tipoAlteracao`, `criadaEm`, `autor`, `substituidaPorId`. Criação, detalhe, vigente e conferência: [inventário](inventario.md).                        |
| GET `/empreendimentos/:id/respostas`                                  | Resumos: `id`, `pesquisaId`, `titulo`, `respondidaEm`, `canal`.                                                                                                                                                                                               |
| GET `/empreendimentos/:id/contatos`                                   | Coleção OData de contatos do cadastro autorizado.                                                                                                                                                                                                             |
| GET `/empreendimentos/:id/cadastur`                                   | Coleção OData dos registros de Cadastur do cadastro autorizado.                                                                                                                                                                                               |
| GET `/empreendimentos/exportacoes`                                    | Mesmos resumos e escopo da consulta, exigindo também exportação.                                                                                                                                                                                              |
| GET `/indicadores` e `/indicadores/exportacoes`                       | Resultados filtrados por visibilidade do perfil; exportar exige consultar e exportar.                                                                                                                                                                         |

## Contexto de entidade (`x-identification`)

Dados de um empreendimento são vistos sempre **no contexto de uma entidade**. O cliente
informa a entidade contextualizada no cabeçalho `x-identification` (constante
`CABECALHO_CONTEXTO` do common), com o ID do empreendimento: inteiro positivo de 32 bits,
sem formatação. O contexto é um **filtro, não uma permissão**: o escopo e o vínculo ativo
continuam decididos no servidor a cada requisição.

| Endpoint                                                                               | Sem cabeçalho                                                              | Com cabeçalho                                           |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `GET /empreendimentos/:id` e coleções `/:id/{inventarios,respostas,contatos,cadastur}` | 400 `CONTEXTO_OBRIGATORIO`                                                 | Deve ser igual a `:id`, senão 409 `CONTEXTO_DIVERGENTE` |
| `GET /empreendimentos/exportacoes`                                                     | Escopo `todos`: conjunto autorizado; escopo `vinculados`: 400 obrigatório  | Somente a entidade informada (se autorizada)            |
| `GET /empreendimentos` (catálogo de seleção)                                           | Resumos autorizados, paginados; `busca` filtra por nome (1–100, sem caixa) | Ignorado: é o que permite escolher ou trocar a entidade |
| Indicadores, contas, perfis, `/acessos/atual`                                          | Visão geral do OTO                                                         | Ignorado                                                |

Ordem das decisões: formato do cabeçalho (400 `CONTEXTO_INVALIDO`), presença (400),
autorização por escopo e vínculo (404, sem confirmar existência) e, por fim, divergência
(409). Assim um ID alheio nunca revela mais que um ID inexistente.

No frontend o contexto fica em um React context (`ContextoEntidadeProvider`) e é trocado no
dropdown do botão da conta, no canto direito do cabeçalho (que também mostra e-mail, perfil e
Sair), com busca e lista infinita sobre o catálogo paginado. Com empreendimento
selecionado, o menu da visão geral some e a página inicial passa a ser a dele; ao voltar para
a visão geral do OTO, o menu e a página inicial da visão geral retornam. A última
escolha guardada no navegador só por conveniência e conferida no servidor antes de valer.
Perfis de escopo `todos` (administrador, gestor, estagiário) começam na **visão geral do
OTO** e podem escolher qualquer empreendimento, com busca; perfis de escopo `vinculados`
(empresário) sempre têm um dos próprios vínculos selecionado, sem visão geral. Visualizador
não seleciona entidade. A área "Minha conta" fica para uma etapa posterior.

Nome de conta: 1–200 caracteres após trim; e-mail válido até 254, normalizado em
minúsculas; perfil deve pertencer ao catálogo; `ativo`/`permitido` são booleanos.
Campos extras e combinações inválidas retornam 400; duplicidade de e-mail,
autodesativação, troca do próprio perfil e remoção do mínimo administrativo retornam 409. Sem sessão: 401; sem permissão: 403; alvo inexistente/no escopo: 404.
Erros seguem `{error:{code,message,details?}}`, sem detalhes internos.

`cnpj` é o texto cadastrado, sem unicidade nem validação de dígitos aprovadas (R01); `null` significa
"não informado": o frontend exibe então o **ID do sistema** (`ID 900001`) como identificação,
e, havendo CNPJ, o formata (14 dígitos) como
`00.000.000/0000-00`. A massa fictícia não traz CNPJ.

Inventários mantêm `null` para capacidade desconhecida, sem converter em zero.
Vigências usam `YYYY-MM-DD`; timestamps usam ISO UTC. Indicador contém `id`,
`periodoId`, `indicadorId`, `nome`, `unidade`, `periodo`, `tipoColeta`, `recorte`, `metodo`
e `valor` decimal como string. Esta consulta não calcula nem homologa fórmulas ou
escalas; a definição/metodologia de cada indicador pertence às partes 15–16.

Exemplo fictício de criação:

```json
{
  "nome": "Pessoa fictícia",
  "email": "pessoa@example.test",
  "perfil": "empresario"
}
```

## Sessões, concorrência e auditoria

Escritas exigem cookie de sessão, Origin configurado, JSON e `X-OTO-Request: 1`,
conforme o [contrato de autenticação](autenticacao.md). Código de ativação expira
em uma hora, é mostrado após criação/recuperação e deve ser entregue ao titular
por canal separado; listagens e auditorias nunca o retornam. O administrador pode
ocultá-lo na interface. Alterações do perfil/ativo invalidam códigos pendentes;
recuperação inutiliza códigos anteriores e revoga sessões/credencial anterior.

Mudanças administrativas são serializadas com advisory lock compartilhado com o
CLI; sessão e permissão são revalidadas dentro da transação. Mudança, snapshots de
auditoria e incremento da revisão são atômicos. Não se pode desativar/trocar o
próprio perfil ou remover o último administrador ativo. Vínculos revogam sessões
do titular; permissões/visibilidade revogam sessões de todo o perfil afetado.
O servidor verifica sessão a cada requisição, sem confiar em cache de permissão.

React Query separa caches por identidade, revisão, recurso, vínculo e página.
Mudanças locais invalidam consultas; revisão do acesso é revalidada a cada 15 s e
ao retomar foco. Falha 401/403 nessa revalidação remove dados protegidos; 401 também
revalida a sessão. Logout/troca de identidade limpam caches. Formulários usam
TanStack Form com `Input`/`Select` reutilizáveis e bloqueiam submissões duplicadas.

Uma integração de BI futura deve consumir consultas autenticadas com o mesmo
filtro e permissões. Não existe conector Looker nem credencial SQL de BI nesta
entrega; acesso direto ao banco contornaria a política e não é um contrato público.
A [parte 07](auditoria.md) entrega a consulta administrativa e o detalhe de eventos;
os resumos também podem ser exportados em CSV, com permissão própria de exportação.
