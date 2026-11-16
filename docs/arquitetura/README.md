# Arquitetura da plataforma OTO — POC

Esta documentação foi extraída do código implementado na `main`, não de intenções dos
planos. O objetivo é registrar a arquitetura atual em níveis C4, o modelo de dados e as
fronteiras já exercitadas pelos testes.

A homologação do OTO e as regras de negócio ainda pendentes não são declaradas aqui.
Integrações externas, implantação de produção, importação, cálculo, auditoria consultável
e demais partes 07–21 aparecem apenas como planejadas quando citadas.

## Índice

- [Modelo de dados](modelo-de-dados.md): MER implementado, domínios e evoluções.
- [Contexto e contêineres](c4-contexto-conteineres.md): atores, sistema, SPA, API, common e banco.
- [Componentes](c4-componentes.md): frontend, backend e contratos compartilhados.
- [Implantação](c4-implantacao.md): desenvolvimento local, Docker Compose e CI.
- [MER implementado](../mer.mmd): fonte Mermaid com as 34 tabelas atuais.
- [MER implementado em PNG](../mer.png): imagem gerada a partir de `docs/mer.mmd`.
- [MER original](../referencias/mer-original-2026-11-09/README.md): snapshot de 26 tabelas recebido em 09/11/2026.

## Como ler os diagramas

Os diagramas de arquitetura usam Mermaid `flowchart`, com os níveis C4 como organização
conceitual (contexto, contêineres, componentes e implantação). A escolha evita ícones e
rótulos sobrepostos do C4 nativo. Os casos de uso usam `usecase-beta` no Mermaid 12.

## Fontes de verdade

| Assunto                                 | Fonte                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Rotas, permissões e regras de aplicação | `apps/backend/src/**/*.controller.ts`, `apps/backend/src/acesso/*`                |
| Contratos, validadores e OData          | `common/src/**`                                                                   |
| Interface, rotas e estado de servidor   | `apps/frontend/src/**`                                                            |
| Persistência e migrations               | `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/**`          |
| Infraestrutura                          | `compose.yaml`, `apps/backend/Dockerfile`, `scripts/`, `.github/workflows/ci.yml` |
| Evidência de comportamento              | `apps/backend/test/**`, `apps/frontend/src/**/*.test.ts(x)`, `common/test/**`     |

## Limites desta arquitetura

- É uma POC local; não há topologia de produção, alta disponibilidade ou backup validado.
- O frontend roda no Vite em desenvolvimento; o Compose atual sobe apenas API e PostgreSQL.
- Não há integrações externas implementadas: Looker Studio, e-mail/notificações, BI e
  importação de arquivos pertencem a etapas posteriores.
- A matriz de permissões é configurável; os diagramas de casos de uso refletem os padrões
  técnicos da POC, não uma homologação definitiva de alçadas.
- O MER original de 26 tabelas foi preservado como referência, mas o schema atual tem 34
  tabelas e é a fonte para qualquer análise de implementação.
