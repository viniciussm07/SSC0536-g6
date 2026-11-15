# 02 — Autenticação e ciclo de vida das contas

**Situação:** planejado; não implementado por este documento.

**Rastreabilidade:** RF19; RNF02, RNF03 e RNF14.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md), [01](01-contrato-de-dados-e-regras.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md) e os recortes pertinentes:

- [Controle de pesquisas](../planilhas/controle-pesquisas/README.md).

A planilha é contexto operacional, não uma base de credenciais. Não provisionar contas automaticamente a partir de contatos ou nomes encontrados nos esqueletos.

## Objetivo

Permitir contas individuais identificáveis, preparando a autorização e a atribuição das alterações.

## Definições antes de implementar

Validar login institucional ou credenciais locais, criação por convite/administração,
recuperação de acesso e quem pode ativar/desativar contas. Não presumir login por CNPJ,
conta compartilhada por perfil ou cadastro público de empresários.

## Backend e dados

- Criar módulo de autenticação integrado a `Usuario`, separando identidade, credencial e sessão.
- Evoluir o schema para o mecanismo aprovado; hoje `Usuario` não armazena credenciais/sessões.
- Para senha local, persistir somente hash apropriado; definir expiração e revogação de sessões,
  proteção contra tentativas repetidas e resposta que não exponha existência de contas.
- Para autenticação externa, validar a identidade no servidor e mapear o identificador do provedor.
- Definir transporte da sessão e proteção correspondente (cookies/CSRF ou tokens), logout,
  recuperação e revogação quando uma conta é desativada. Não registrar segredos na auditoria.
- Preparar o primeiro administrador por procedimento controlado, sem senha fixa no Git.

## Frontend

Login com identidade institucional, estados de erro/carregamento, recuperação conforme
mecanismo aprovado, expiração de sessão, logout e tratamento de conta inativa. Recuperar
a sessão antes de exibir conteúdo protegido; não confiar apenas em rotas escondidas.

## Critérios de aceite e testes

- Usuários do mesmo perfil possuem identidades individuais e sessões independentes.
- Credenciais inválidas e contas inativas não iniciam sessão; credenciais não aparecem em logs.
- Logout/revogação impede reutilização da sessão conforme a estratégia adotada.
- Erros de autenticação retornam resposta consistente, distinta de falta de permissão.
- Fluxos essenciais funcionam por teclado e em tela pequena.

## Entregáveis

Contratos das rotas de sessão/conta, migration necessária, fluxo de acesso completo,
procedimento de bootstrap e testes de autenticação. Permissões de negócio são a parte 03.
