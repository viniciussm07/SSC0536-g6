# SSC0536 — Grupo 6

Monorepo pnpm com React + Vite no frontend, NestJS no backend e PostgreSQL com Prisma.
Os dois módulos usam TypeScript.

## Inicialização completa com um comando

Com Docker e Docker Compose v2 instalados e o Docker em execução:

```sh
bash scripts/start.sh
```

O script cria os três arquivos `.env` a partir dos exemplos quando não existem,
instala as dependências nas imagens Docker, gera o cliente Prisma, compila o backend,
inicia o Postgres, aplica as migrations e inicia backend e frontend. Ele aguarda os
três serviços ficarem saudáveis e termina, mantendo-os em segundo plano.
Arquivos `.env` existentes são preservados. Não é necessário instalar Node ou pnpm no host.

Frontend: [http://localhost:5173](http://localhost:5173).
API: [http://localhost:3000/api/health](http://localhost:3000/api/health).

Para encerrar toda a aplicação, preservando o volume do banco:

```sh
bash scripts/stop.sh
```

Se tiver pnpm no host, os atalhos são `pnpm start` e `pnpm stop`.
Os scripts funcionam a partir de qualquer diretório e podem ser executados novamente.
Após alterar o código, rode o script de inicialização novamente para reconstruir as imagens.
O frontend usa o servidor Vite para desenvolvimento; esse fluxo é destinado ao ambiente local.

Nesse modo, as configurações são lidas do `.env` da raiz: `FRONTEND_PORT` (5173),
`BACKEND_PORT` (3000) e as variáveis do Postgres. `VITE_API_URL` pode ser definido na raiz
para substituir a URL pública da API; por padrão ela usa `BACKEND_PORT`.
Se mudar a porta do frontend, ajuste também `FRONTEND_URL` para a origem correspondente.
Os `.env` dos módulos são preparados para o modo local descrito abaixo.
Em caso de falha, o script mostra os logs recentes e retorna erro. Para encerrar os serviços
que já tenham iniciado, execute o script de encerramento.

## Requisitos

- Node.js 24.13+ na linha 24 (`nvm use`).
- pnpm 10.28.1 (`corepack enable`).
- Docker com Docker Compose v2.

## Desenvolvimento local

Na raiz do repositório:

```sh
corepack enable
pnpm install
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
pnpm db:up
pnpm db:deploy
pnpm dev
```

- Frontend: [http://localhost:5173](http://localhost:5173).
- Saúde da API e do banco: [http://localhost:3000/api/health](http://localhost:3000/api/health).

`pnpm dev` inicia os dois módulos com atualização automática. O cliente Prisma é gerado
antes de iniciar o backend. Use o botão **Testar conexão** na página inicial para verificar
o caminho frontend → API → banco. A API retorna HTTP 503 se o banco estiver indisponível.

## Backend e banco pelo Docker

```sh
cp .env.example .env
pnpm docker:up
```

O Compose aguarda o Postgres ficar saudável, compila o backend, aplica as migrations
versionadas e inicia a API. Esse modo usa o código compilado; após alterações, execute
`pnpm docker:up` novamente para reconstruir a imagem.

Para rodar somente o frontend localmente junto com esse backend:

```sh
pnpm install
cp apps/frontend/.env.example apps/frontend/.env
pnpm dev:frontend
```

Não execute o backend local e o backend Docker na mesma porta ao mesmo tempo.
Use `pnpm docker:logs` para acompanhar os logs e `pnpm docker:down` para parar os serviços.
O volume do Postgres persiste após `docker:down`. O comando `docker compose down -v`
remove os dados locais.

## Estrutura

```text
apps/
  frontend/
    src/components/ui/   # Componentes shadcn/ui
    src/lib/             # Cliente HTTP e utilitários
    components.json      # Configuração do CLI shadcn
    package.json
  backend/
    src/config/          # Validação de variáveis de ambiente
    src/health/          # GET /api/health
    src/prisma/          # Módulo e serviço de acesso ao banco
    prisma/              # Schema e migrations versionadas
    test/                # Testes HTTP e de configuração
    Dockerfile
    package.json
compose.yaml
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
```

## Comandos

| Comando                                   | Uso                                                |
| ----------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                                | Inicia frontend e backend localmente               |
| `pnpm dev:frontend` / `pnpm dev:backend`  | Inicia apenas um módulo                            |
| `pnpm build`                              | Gera builds dos dois módulos                       |
| `pnpm lint`                               | Executa ESLint nos módulos                         |
| `pnpm typecheck`                          | Verifica os tipos dos dois módulos                 |
| `pnpm test`                               | Executa os testes do backend sem precisar de banco |
| `pnpm format` / `pnpm format:check`       | Formata ou verifica a formatação                   |
| `pnpm db:up` / `pnpm db:down`             | Inicia ou para apenas o Postgres                   |
| `pnpm db:generate`                        | Gera o cliente Prisma a partir do schema           |
| `pnpm db:migrate --name nome_da_migracao` | Cria/aplica uma migration em desenvolvimento       |
| `pnpm db:deploy`                          | Aplica migrations já versionadas                   |
| `pnpm db:studio`                          | Abre a interface do Prisma Studio                  |
| `pnpm docker:up` / `pnpm docker:down`     | Inicia ou remove backend e banco do Compose        |

O build gera `apps/frontend/dist` (arquivos estáticos) e `apps/backend/dist`
(iniciado com `pnpm --filter @ssc0536/backend start`).

## Variáveis de ambiente

| Arquivo              | Variáveis                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `.env`               | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `BACKEND_PORT`, `FRONTEND_URL` para o Compose |
| `apps/backend/.env`  | `DATABASE_URL`, `PORT`, `FRONTEND_URL`, `NODE_ENV` para execução local e Prisma CLI                                 |
| `apps/frontend/.env` | `VITE_API_URL`, a URL pública da API incluindo `/api`                                                               |

Os arquivos `.env` ficam fora do Git; os exemplos ficam versionados. As credenciais dos
exemplos são destinadas ao desenvolvimento local. Ao mudar usuário, senha, banco ou porta
no `.env` da raiz, atualize também `DATABASE_URL` no backend local. Senhas com caracteres
reservados precisam ser codificadas para uso em URLs. Alterar as variáveis de inicialização
do Postgres não modifica usuários ou bancos de um volume já existente.

No Docker, o backend acessa `postgres:5432`; no host, usa `localhost:5432`. Se mudar
`BACKEND_PORT`, atualize `VITE_API_URL`. Se mudar a origem do frontend, atualize
`FRONTEND_URL` para permitir CORS. Variáveis `VITE_*` são públicas e incorporadas ao build;
nunca coloque segredos nelas.

## Prisma

O backend usa Prisma ORM 7 com o adapter PostgreSQL (`@prisma/adapter-pg`). O schema
inicial contém um modelo `User` de exemplo, com e-mail único e timestamps, sem rotas
de usuários ou autenticação. Adapte-o ao domínio antes de criar novas funcionalidades.

O cliente gerado fica em `apps/backend/src/generated/prisma`, fora do Git. O build,
o desenvolvimento, os testes e a verificação de tipos geram esse cliente automaticamente.
Para mudar o banco, edite `apps/backend/prisma/schema.prisma` e execute:

```sh
pnpm db:migrate --name descricao_da_alteracao
pnpm db:generate
```

Versione o schema e a migration SQL resultante. O container usa `prisma migrate deploy`
ao iniciar; ele aplica migrations existentes e não cria novas.

## Componentes de interface

O frontend inclui **Button, Card, Input, Label, Badge, Separator e Dialog** do shadcn/ui,
com Tailwind CSS 4, tokens de tema e alias `@/` para `src/`.
Para adicionar outros componentes:

```sh
pnpm --filter @ssc0536/frontend ui:add textarea
```

Referências: [shadcn/ui com Vite](https://ui.shadcn.com/docs/installation/vite),
[integração NestJS e Prisma](https://docs.nestjs.com/recipes/prisma).
