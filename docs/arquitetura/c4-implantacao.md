# Implantação

## Desenvolvimento local

As visões usam Mermaid flowchart para manter a leitura. O fluxo documentado no README usa Vite no host e Docker Compose apenas para API e
PostgreSQL. O frontend **não** é um serviço do Compose atual.

```mermaid
flowchart LR
    subgraph HOST["Máquina do desenvolvedor"]
        subgraph BROWSER["Navegador"]
            spa["SPA React"]
        end
        subgraph VITE["Vite dev server — 5173"]
            assets["Assets do frontend"]
        end
        subgraph COMPOSE["Docker Compose"]
            subgraph APIC["Container backend — 3000"]
                api["API NestJS"]
            end
            subgraph DBC["Container PostgreSQL — 5432"]
                banco[("Banco OTO<br/>volume postgres_data")]
            end
        end
    end

    assets -->|"serve"| spa
    spa -->|"JSON / API"| api
    api -->|"Prisma / SQL"| banco

    classDef componente fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef database fill:#ecfdf5,stroke:#047857,color:#064e3b
    class spa,assets,api componente
    class banco database
```

### Fatos operacionais

- O backend executa `pnpm db:deploy && node dist/main.js` no container; migrations são
  aplicadas na inicialização.
- O PostgreSQL usa imagem construída por `scripts/postgres.Dockerfile`, com PostGIS, e
  volume `postgres_data`.
- As portas publicadas ficam restritas a `127.0.0.1`.
- O healthcheck da API consulta `/api/health`; o do banco usa `pg_isready`.
- Variáveis relevantes: `DATABASE_URL`, `PORT`, `FRONTEND_URL`, `AUTH_COOKIE_SECURE`.
- O build do frontend gera `apps/frontend/dist`, mas não há hospedagem de produção
  definida nesta POC.

## Integração contínua

```mermaid
flowchart LR
    subgraph GHA["GitHub Actions — ubuntu-24.04"]
        jobs["Jobs de qualidade<br/>validate, format, lint, typecheck, testes e build"]
        banco[("PostgreSQL/PostGIS efêmero<br/>oto_ci_test")]
    end

    jobs -->|"migrations + integração"| banco

    classDef componente fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef database fill:#ecfdf5,stroke:#047857,color:#064e3b
    class jobs componente
    class banco database
```

O CI não usa segredos de produção. A suíte de integração exige um banco exclusivo com
nome terminado em `_test`; migrations reais e PostGIS são necessários. A implantação de
produção, backup e recuperação pertencem ao plano 21 e não estão implementados.
