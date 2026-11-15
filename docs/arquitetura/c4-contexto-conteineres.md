# Contexto e contêineres

## Contexto

As visões usam Mermaid flowchart para evitar a sobreposição de ícones e rótulos do C4; os níveis C4 orientam a organização. A plataforma OTO é uma POC local. Os atores humanos usam a interface web; operação e CI
executam comandos administrativos e verificam a saúde. Não há integração externa
implementada nesta etapa: Looker Studio, e-mail/notificações e BI continuam planejados ou
condicionados.

```mermaid
flowchart LR
    visitante["Visitante<br/>login e ativação"]
    usuario["Usuário autenticado<br/>cinco perfis"]
    operacao["Operação/CI<br/>comandos e healthcheck"]

    subgraph OTO["Plataforma OTO (POC)"]
        plataforma["SPA React + API NestJS + common"]
        banco[("PostgreSQL 17 + PostGIS<br/>dados e PostGIS")]
    end

    visitante -->|"HTTPS"| plataforma
    usuario -->|"HTTPS"| plataforma
    operacao -->|"CLI / HTTP"| plataforma
    plataforma -->|"Prisma / SQL"| banco

    classDef ator fill:#fff7ed,stroke:#c2410c,color:#431407
    classDef sistema fill:#e8f1ff,stroke:#1d4ed8,color:#0f172a
    classDef database fill:#ecfdf5,stroke:#047857,color:#064e3b
    class visitante,usuario,operacao ator
    class plataforma sistema
    class banco database
```

## Contêineres

O frontend é servido pelo Vite em desenvolvimento; o build estático existe, mas não há
serviço de frontend no Compose. A API e o PostgreSQL/PostGIS formam os contêineres do
Compose local. O pacote `common` é uma biblioteca de build-time, não um serviço em
execução.

```mermaid
flowchart LR
    usuario["Usuário autenticado<br/>perfis de acesso"]
    operacao["Operação/CI<br/>comandos e healthcheck"]

    subgraph OTO["Plataforma OTO (POC)"]
        spa["SPA React<br/>Vite, TanStack Router/Query/Form/Table"]
        api["API NestJS<br/>REST /api, sessão e autorização"]
        common["Biblioteca common<br/>contratos, validadores e OData"]
        banco[("PostgreSQL 17 + PostGIS<br/>Prisma e migrations")]
    end

    usuario -->|"HTTPS"| spa
    operacao -->|"HTTP / CLI"| api
    spa -->|"JSON / API"| api
    api -->|"Prisma / SQL"| banco
    spa -.->|"build-time"| common
    api -.->|"build-time"| common

    classDef ator fill:#fff7ed,stroke:#c2410c,color:#431407
    classDef sistema fill:#e8f1ff,stroke:#1d4ed8,color:#0f172a
    classDef database fill:#ecfdf5,stroke:#047857,color:#064e3b
    class visitante,usuario,operacao ator
    class spa,api,common sistema
    class banco database
```

## Decisões visíveis nos contêineres

- **Sessão no servidor:** a SPA não guarda token em `localStorage`; a API usa cookie
  `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- **Autorização central:** a API revalida sessão e permissão em cada requisição; a interface
  apenas evita exibir telas sem permissão.
- **Contexto de entidade:** o cabeçalho `x-identification` é um filtro de escopo, não uma
  prova de acesso.
- **Contratos compartilhados:** a SPA e a API importam `@ssc0536/common`; não há cópia de
  contratos entre os apps.
- **Persistência especializada:** PostGIS e constraints de exclusão de vigência não são
  representados pelo acesso tipado do Prisma Client; usam SQL/migrations controladas.
