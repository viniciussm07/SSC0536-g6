# Massa fictícia compartilhada OTO

[scenario.json](scenario.json) é o cenário determinístico para desenvolvimento de backend,
frontend e testes. Os registros foram inventados com base nos campos do MER e nos layouts
descritos em [docs/planilhas](../../docs/planilhas/README.md), sem copiar pessoas, empresas,
contatos ou respostas operacionais. Os esqueletos originais permanecem intactos.

## Cenários disponíveis

- Sete usuários nos cinco perfis previstos, incluindo conta e vínculo inativos; e-mails `example.test`.
- Quatro hospedagens sem CNPJ, incluindo cadastro parcial, encerrado e nomes semelhantes.
- Dois empresários vinculados a hospedagens distintas, para testar acesso cruzado futuramente.
- Duas versões de capacidade do Hotel Fictício Alfa (10/15 UH e 20/30 leitos), com vigências.
- Catálogo com opção exclusiva, itens sim, não informado e não se aplica; métricas desconhecidas
  permanecem ausentes, em vez de serem convertidas em zero.
- Meses e período especial fictício; pesquisas abertas, encerradas, futura e sem respostas.
- Respostas 75%, 50%, 0% e expectativa 80%; ausência de resposta é diferente de zero.
- Coletas de diária, RHC agregado, parâmetro demonstrativo e resultado vinculado aos inventários.
- Casos inválidos descritos fora das tabelas de carga, para futuros testes de domínio.

IDs começam em 900001. Datas são fixas; use `metadata.referenceDate` como relógio de referência
em testes de prazo, em vez da data atual. O período especial não declara um feriado oficial.

O indicador de demonstração usa somente `(75 + 50) / 2 = 62.5`. Não é fórmula homologada pelo
OTO, nem deve ser usado como regra oficial. Políticas de envio e publicação continuam
dependendo de seus fluxos. A autenticação local já permite usar o administrador fictício
descrito abaixo; os demais usuários não recebem credenciais automaticamente.

## Acesso compartilhado de demonstração

[acesso-demo.json](acesso-demo.json) registra a credencial **fictícia e pública** para
qualquer pessoa testar o ambiente local depois da carga:

- E-mail: `admin@example.test`
- Senha: `OtoDemoAdmin!2026`

Esse acesso usa o administrador existente de ID `900001`, sem criar contas adicionais
a cada demonstração. A senha é convertida em hash scrypt pelo seed; não é armazenada
em texto no banco ou na auditoria. A sessão e a validação continuam passando pela API
real, sem bypass ou fallback no frontend. Não usar essa credencial em produção ou em
ambiente público. Os limites normais de tentativas de login continuam valendo.

## Contas de demonstração por perfil

[acessos-perfis-demo.json](acessos-perfis-demo.json) registra credenciais **fictícias e
públicas** para os demais perfis, usando usuários que já existem em `scenario.json`.
Com o administrador acima, há uma conta de cada tipo:

| Perfil        | E-mail                 | Senha                 | Escopo no cenário                                                |
| ------------- | ---------------------- | --------------------- | ---------------------------------------------------------------- |
| administrador | `admin@example.test`   | `OtoDemoAdmin!2026`   | Gestão de contas, vínculos, permissões e visibilidade            |
| gestor        | `gestor@example.test`  | `OtoDemoGestor!2026`  | Cadastro, inventário, pesquisas, importação e indicadores        |
| estagiario    | `estagio@example.test` | `OtoDemoEstagio!2026` | Apoio a cadastro e coleta, sem publicar                          |
| visualizador  | `leitura@example.test` | `OtoDemoLeitura!2026` | Somente indicadores liberados (o de demonstração `900001`)       |
| empresario    | `alfa@example.test`    | `OtoDemoAlfa!2026`    | Somente o Hotel Fictício Alfa (`900001`)                         |
| empresario    | `beta@example.test`    | `OtoDemoBeta!2026`    | Somente a Pousada Fictícia Beta (`900002`); testa acesso cruzado |

O usuário `inativo@example.test` (ID `900007`) segue sem credencial, para testar conta
e vínculo desativados. As permissões vêm da matriz da POC em
[contratos/acesso](../../docs/contratos/acesso.md); a visibilidade é restrita por
padrão, então o seed libera o indicador de demonstração apenas para `gestor` e
`visualizador`. Qualquer outro perfil não vê indicadores até que o administrador os libere.

As regras são as do administrador: senha convertida em hash scrypt, sem texto puro no
banco ou na auditoria; login pela API real, sem bypass; limites normais de tentativas.
Um marcador próprio (`fixture_profile_access`) inicializa tudo uma única vez e repetir o
seed não restaura senha alterada, não reativa conta nem apaga visibilidade configurada.
Se alguma dessas contas já tiver sido gerenciada, a carga recusa habilitá-las; use a
recuperação administrativa, sem resetar a base. Não usar em produção ou ambiente público.
Não são metodologia nem homologação do OTO.

O cenário original e seu hash permanecem inalterados. Um marcador separado inicializa
o acesso uma única vez, inclusive ao repetir o seed em massa antiga compatível que
ainda não tenha credencial ou recuperação para o admin fictício. Depois disso, repetir
não restaura senha alterada/removida, não reativa conta nem cancela recuperação.
Se a conta já tiver sido gerenciada antes desse marcador, a carga recusa habilitá-la;
use o procedimento administrativo de recuperação, sem resetar a base.

O arquivo separado [contrato-dados.json](contrato-dados.json) contém os casos C01–C11
do [contrato canônico v1](../../docs/contratos/README.md), com referência aos cabeçalhos
reais do inventário e valores inteiramente fictícios. É consumido pelos testes do common
para comparar entradas manuais e células já decodificadas. Não integra o seed nem altera
o hash/versão de `scenario.json`; também não é uma planilha importável ou aceite do OTO.

[indicadores-referencia.json](indicadores-referencia.json) é a massa de referência das
[fórmulas v1 dos indicadores](../../docs/contratos/indicadores.md): populações fictícias,
parâmetros registrados como hipótese (inclusive o day use) e resultados esperados calculados
à mão pela equipe. É consumida pelos testes do common, não integra o seed nem altera o hash
de `scenario.json`, e não representa resultado oficial ou aprovado pelo OTO.

## Série fictícia do painel de indicadores

[indicadores-demo.json](indicadores-demo.json) alimenta o painel da parte 18. Tem 12 meses
(out/2025 a set/2026) e 4 feriados prolongados, com taxa de ocupação (`%`) em Expectativa e
Consolidado nos recortes total, hotel, pousada e resort, e diária média (`R$`) consolidada
por tipo. Lacunas são intencionais: quatro meses sem expectativa e um recorte sem consolidado,
para demonstrar ausência sem zero. Definições e períodos dizem "fictícia/fictício" no nome;
os valores foram inventados, não calculados por fórmula, e não são resultado do OTO.

É separada de `scenario.json` (cujo hash não muda) e usa IDs 910001+. A carga é própria:

```sh
DATABASE_URL=postgresql://app:app@localhost:5432/oto_dev pnpm db:indicadores-demo
```

Ela tem as mesmas proteções do seed (só `_dev`/`_test` locais, nunca NODE_ENV=production,
nunca automática), roda numa transação com lock consultivo e grava o marcador
`fixture_indicadores_demo` (auditoria 9000003) com o sha256 da fixture. Repetir com a mesma
versão é no-op. Não exige base vazia nem apaga nada: recusa a carga inteira se IDs, códigos
ou períodos equivalentes (mesmo tipo e datas) já existirem, ou se o marcador for de outra
versão. Libera os dois indicadores para gestor e visualizador sem alterar visibilidades
existentes. Para ver o painel com login, rode antes o `pnpm db:seed` na mesma base: o seed
exige base de domínio vazia, então carregar esta série primeiro faria o seed recusar.

## Carregar no banco

Use uma base local exclusiva com nome terminado em `_dev` ou `_test`. A carga recusa
NODE_ENV=production, URLs remotas e bases de domínio preenchidas. Não apaga dados e não roda
automaticamente em `scripts/start.sh`.

Exemplo criando uma base nova, com os serviços do projeto já iniciados:

```sh
docker compose exec postgres createdb -U app oto_dev
DATABASE_URL=postgresql://app:app@localhost:5432/oto_dev pnpm db:deploy
DATABASE_URL=postgresql://app:app@localhost:5432/oto_dev pnpm db:seed
```

Ajuste usuário/porta conforme seu `.env`. Para a aplicação usar essa base, configure
DATABASE_URL no backend local; no Docker, configure POSTGRES_DB para a base correspondente.

O seed usa transação e marcadores com hashes do cenário e do acesso demo. Depois da
inicialização do acesso, executá-lo novamente com a mesma versão não duplica registros
nem sobrescreve edições locais. Se o cenário ou a fixture de acesso mudar, a carga recusa um
marcador antigo: prepare outra base vazia, sem resetar uma base com trabalho de desenvolvedores.

## Testes e uso no frontend

`pnpm test:unit` verifica guardas da carga e invariantes da massa, além dos testes de back/front.
`DATABASE_TEST_URL=postgresql://app:app@localhost:5432/oto_test pnpm test:integration`
testa os relacionamentos e a carga repetida em banco isolado migrado; as fixtures são revertidas
ao final das transações. A CI fornece esse banco com PostGIS.

Frontend e mocks podem consumir o mesmo JSON para exemplos e testes. Não ligar dados fictícios
como fallback silencioso quando a API real falhar. Novas regras devem acrescentar casos e
resultados esperados, mantendo a origem sintética explícita e a validação do OTO separada.
