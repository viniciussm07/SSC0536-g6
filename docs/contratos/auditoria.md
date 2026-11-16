# Auditoria de alterações — contrato técnico v1

Implementa a [parte 07](../plano/07-auditoria-de-alteracoes.md) sobre a matriz da
[parte 03](acesso.md). Eventos de negócio são registros históricos somente para leitura.

## Acesso e endpoints

- `GET /api/auditorias`: coleção OData de resumos; sucesso 200 com `{data: [], meta: {top, skip, total?}}`.
- `GET /api/auditorias/:id`: detalhe; sucesso 200 com `{data: EventoAuditoriaDetalhe}`.

Ambos exigem sessão válida e permissão `auditoria:consultar` com escopo `todos`.
O limite de perfil continua exclusivo do administrador; não há bypass administrativo
nem acesso concedido por um ID ou filtro. A página `/auditoria` aparece na visão geral
do OTO conforme a permissão, independente de poder gerenciar contas.

Não existem endpoints de criação, edição, exclusão ou expurgo de eventos.
`GET /api/auditorias/exportacoes` exporta os resumos autorizados em CSV, exigindo
`auditoria:consultar` e `auditoria:exportar`; veja [exportações CSV](exportacoes.md).
A origem e a autoria não são recebidas em formulários HTTP. O cabeçalho de contexto de
empreendimento não altera o escopo global desta consulta administrativa.

Erros usam o envelope comum: 400 para consulta/ID malformado, 401 sem sessão, 403 sem
permissão, 404 para evento inexistente e 503 em falha de dependência. Todas as respostas
são `Cache-Control: no-store`.

## Resumo e filtros

O contrato público está no domínio `auditoria` de `@ssc0536/common`; a coleção usa
`ESQUEMA_AUDITORIAS`. Todos os campos de dados da linha são filtráveis e ordenáveis:

| Campo                    | Tipo e significado                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `id`                     | Inteiro positivo; identidade do evento.                                               |
| `entidade`, `entidadeId` | Identificação estável do domínio/registro alterado, sem depender de seu estado atual. |
| `acao`                   | Ação registrada: `criar`, `alterar` ou `excluir`.                                     |
| `em`                     | Timestamp ISO 8601 UTC, determinado no servidor.                                      |
| `usuarioId`              | ID da pessoa autenticada/operadora; null para processo automático.                    |
| `autor`                  | Nome preservado no instante do evento, ou identificação do processo.                  |
| `origem`                 | `manual` ou `automatica`.                                                             |
| `processo`               | Código do processo automático; null para ação manual.                                 |
| `correlacaoId`           | Identificação opcional de lote/operação; null quando não há correlação.               |

Os identificadores de entidade já usados nos registros incluem `conta`,
`usuario_empreendimento`, `permissao_perfil`, `visibilidade_indicador_perfil`,
`empreendimento`, `inventario_versao`, `catalogo_grupo` e `catalogo_item`.
Novos domínios devem definir seu identificador e os campos permitidos do snapshot.
Não são retornados modelos Prisma nem dados brutos das tabelas relacionadas.

Use `$filter`, `$orderby`, `$top` (padrão 20, máximo 100), `$skip` e `$count` conforme
[OData](odata.md). Sem `$count=true`, `total` não aparece. A ordem padrão é `em desc,
id desc`, com desempate por ID. O filtro de período usa timestamps UTC explícitos:

```text
/api/auditorias?$filter=entidade eq 'empreendimento' and em ge 2026-11-01T00:00:00Z and em lt 2026-12-01T00:00:00Z&$count=true
```

Nome do autor é o nome histórico; renomear/inativar a conta não modifica eventos.
Para eventos legados, o nome é o conhecido na migration; nomes antigos que nunca
foram gravados não podem ser reconstruídos. A coleção não retorna snapshots. Uma correlação agrupa operações, sem provar autoria
nem conceder acesso. O código de processo/correlação é informado somente por código
interno confiável, limitado a 120 caracteres alfanuméricos e `._:-`.

## Detalhe e diferenças

O detalhe acrescenta `antes`, `depois` e `diferencas`. Os dois snapshots são objetos
JSON ou null. São parciais: contêm somente os campos auditados pela operação. Arrays
são comparados como um campo; a ordem de chaves de um objeto não produz diferença.

Exemplo fictício de diferença:

```json
{
  "campo": "leitos",
  "antes": null,
  "depois": 0,
  "antesPresente": true,
  "depoisPresente": true
}
```

`antesPresente=false` representa ausência do campo; não equivale a null. Zero, false e
string vazia são preservados. A UI mostra valores antes/depois, autoria, data, origem e
correlação. Não há ação de gravação no detalhe. Consultas são canceladas ao fechar o
diálogo e caches protegidos são removidos ao encerrar sessão ou revogar acesso.

## Gravação, segurança e histórico

`registrarAuditoria(tx, entrada)` é o gravador transacional compartilhado pelos módulos
atuais. O chamador fornece a transação da alteração de negócio; nenhuma conexão paralela
é aberta. Falha de auditoria reverte a mutação. Autoria manual vem da sessão validada
ou do procedimento operacional de contas já autorizado; nome é lido no servidor.

Autenticação registra abertura/encerramento de sessão e definição de senha, apenas como
códigos de evento. Não registra senha, hash, token, cookie, corpo de login ou IP.
Cadastro, contatos/Cadastur, vínculos, políticas, catálogo e inventário continuam auditados
na mesma transação. Versões novas incluem capacidade e referência/estado dos itens;
o conteúdo de versões históricas existentes não é reescrito.

Os snapshots passam por lista positiva de campos do domínio e remoção recursiva de
chaves de segredos. A mesma proteção é aplicada na leitura dos snapshots legados.
Campos não reconhecidos não são publicados. Contatos e dados de conta necessários à
investigação continuam restritos à consulta administrativa; dados pessoais das planilhas
originais não são importados por esta etapa.

A migration `20261120000000_auditoria_consultavel` preserva IDs, snapshots e timestamps,
preenche o nome do autor dos registros existentes e identifica os três marcadores de
fixtures como `automatica`, processo `db:seed`, sem atribuí-los a pessoa fictícia.
O banco exige autoria humana ou processo, e bloqueia UPDATE, DELETE e TRUNCATE por
triggers. Nomes também são preenchidos no INSERT operacional para preservar o contexto.

Em produção, a identidade de execução deve ter apenas SELECT/INSERT em `auditoria`, sem
ser dona da tabela, superusuária ou responsável pelas migrations. O REVOKE para PUBLIC
não substitui essa separação operacional. O proprietário/superusuário ainda pode alterar
DDL/triggers: a proteção não é uma garantia criptográfica contra administração do banco.
Testes de limpeza desabilitam temporariamente o trigger apenas em transações de bancos
`_test`; não existe mecanismo equivalente na API ou flag de bypass da aplicação.

Retenção, anonimização e eventual descarte dependem de política do OTO. Esta entrega não
estabelece prazo nem expurgo automático. Importações, pesquisas e publicação deverão
usar o mesmo gravador quando forem implementadas; não são antecipadas nesta parte.
