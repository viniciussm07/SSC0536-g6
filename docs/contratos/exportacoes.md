# Exportação CSV das coleções

A exportação é uma capacidade do descritor compartilhado da coleção, em
`common/src/colecoes`. Habilitar `exportacao: true` registra automaticamente a rota
no backend e apresenta o botão na grade para quem possui as permissões necessárias.

## Habilitar uma coleção

O descritor informa caminho, esquema OData e recurso de autorização. A autorização
não é inferida do nome: contatos e Cadastur pertencem a `empreendimentos`.

```ts
const contatos = definirColecao({
  caminho: '/empreendimentos/:id/contatos',
  esquema: ESQUEMA_CONTATOS,
  recursoAcesso: 'empreendimentos',
  contexto: true,
  exportacao: true,
});
```

Registre a coleção uma única vez no módulo Nest, antes de controllers de detalhe:

```ts
controllerColecao(
  COLECOES.contatos,
  ConsultasAcessoService,
  (servico, entrada) =>
    servico.contatos(
      entrada.req.acesso,
      entrada.parametros.id,
      entrada.consulta,
      entrada.contexto,
    ),
);
```

O leitor deve usar `executarColecao`; os callbacks `buscar` e `contar` recebem o
cliente `db` do executor. Não capture o cliente raiz nesses callbacks: a exportação
usa esse ponto para ler todos os lotes na mesma transação `RepeatableRead`.
Autorização, filtro e projeção pública são compartilhados pela listagem e pelo CSV.
O contexto da exportação é isolado por requisição com `AsyncLocalStorage`.

`GradeColecao` resolve o descritor pelo `esquema.recurso`. Para uma coleção nova,
adicione-a a `COLECOES` ou informe `colecao={descritor}`. Nas coleções aninhadas,
informe os mesmos parâmetros e contexto usados para listar:

```tsx
<GradeColecao
  esquema={ESQUEMA_CONTATOS}
  parametros={{ id: empreendimentoId }}
  contexto={empreendimentoId}
  // Demais propriedades habituais da listagem.
/>
```

Após essa integração inicial, basta mudar `exportacao` de `false` para `true`.
Não crie outro controller, serializer, método de serviço, mutation ou botão para CSV.
Novas concessões de acesso continuam exigindo gestão explícita da política.

Opcionalmente configure `exportacao: { nomeArquivo, colunas }`, onde cada coluna
informa `campo` público do esquema e `rotulo`. Sem personalização, são exportados os
campos não virtuais, na ordem do esquema. Campos virtuais exigem configuração e
projeção pública explícitas. Colunas ocultas na interface não alteram o arquivo.

## HTTP

`GET /api<caminho-da-coleção>/exportacoes` aceita somente `$filter` e `$orderby`,
com as mesmas regras da listagem. `$top`, `$skip`, `$count` e parâmetros desconhecidos
retornam 400. São exportadas **todas** as linhas autorizadas do conjunto filtrado,
com ordenação estável; a página aberta na interface não limita o resultado.

Exemplo fictício:

```http
GET /api/empreendimentos/10/contatos/exportacoes?$orderby=id%20desc
Cookie: oto_sessao=<sessão>
x-identification: 10
```

Exige sessão válida e permissões `consultar` e `exportar` no recurso. As coleções de
empreendimento também exigem contexto correspondente e vínculo ativo quando o escopo
é `vinculados`. Indicadores continuam sujeitos à visibilidade por perfil.

Sucesso retorna o arquivo diretamente, sem envelope JSON:

- `Content-Type: text/csv; charset=utf-8`;
- `Content-Disposition: attachment; filename="contatos.csv"`;
- `Cache-Control: no-store`;
- CORS expõe `Content-Disposition` ao transporte autenticado do frontend.

Erros anteriores ao envio seguem o envelope JSON de negócio. O arquivo é preparado
em diretório temporário privado e removido após conclusão, cancelamento ou falha.
Leitura em lotes de 1.000 linhas, transação com timeout de 120 segundos; o transporte
do arquivo também tem timeout de 120 segundos. Uma falha durante o envio interrompe
a transferência, sem acrescentar JSON ao CSV.

## Formato e cobertura

UTF-8 com BOM, separador `;`, CRLF e cabeçalhos em português. Aspas e quebras de linha
são escapadas. Textos que poderiam ser interpretados como fórmulas recebem prefixo
apóstrofo; decimais numéricos mantêm sua precisão e sinal. Nulos ficam vazios, zero
permanece `0`, booleanos são `Sim`/`Não`, datas são `YYYY-MM-DD` e timestamps são UTC.
Conjunto vazio retorna somente os cabeçalhos.

Inclui empreendimentos, indicadores, contatos, Cadastur, respostas, inventários,
grupos e itens de catálogo, versões dos itens, coletas de diária, RHC por período,
parâmetros de cálculo e resumos de auditoria. Auditoria não
exporta snapshots do detalhe. Administração de contas e políticas fica fora.

O frontend apenas solicita, recebe os bytes e inicia o download com o nome definido
pelo backend. Não gera nem interpreta as linhas. Troca de contexto/identidade ou
saída da área cancela downloads pendentes.

## Migração dos contratos anteriores

`/empreendimentos/exportacoes` e `/indicadores/exportacoes` deixam de retornar JSON
paginado e passam a retornar CSV integral filtrado. Clientes que precisam de JSON
continuam usando as respectivas listagens OData. Não enviar parâmetros de paginação
às rotas CSV.

A migration de exportação concede `exportar` em catálogos e auditoria aos perfis que
já consultam esses recursos e são compatíveis com seus limites atuais (administrador).
Não sobrescreve concessões ou negativas explícitas existentes. Atualiza a revisão de
acesso; fixtures e instalações novas usam a mesma matriz inicial.
