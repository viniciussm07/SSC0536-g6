# 02 — Autenticação e ciclo de vida das contas

**Situação:** implementação técnica de credenciais locais, sessões e recuperação
assistida entregue; homologação operacional pelo OTO pendente.

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

## Implementação e decisão de mecanismo

O desenvolvedor confirmou nesta entrega e-mail/senha locais, contas e recuperação
gerenciadas pelo administrador e sessão em cookie seguro. O
[contrato de autenticação](../contratos/autenticacao.md) registra rotas, limites,
transporte/CSRF, expiração/revogação, bootstrap e procedimento operacional. A criação
e recuperação não usam dados de contatos legados nem envio automático de e-mail.

Módulo Nest integrado ao Usuario, migration incremental, contratos ESM/CommonJS,
serviço HTTP e tela de acesso com React Query. Administração assistida via comando
restrito do servidor; gestão visual e autorização de negócio seguem na parte 03.

## Evidências locais e continuidade

- `pnpm validate:repo`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm build` e `pnpm db:validate` aprovados. Originais e hashes preservados.
- Suítes unitárias: 43 testes no common (ESM/CommonJS), 14 no backend e 18 no frontend.
  Cobrem hash/salt, ausência/expiração/revogação, limite de tentativas, CSRF, sessão
  antes do conteúdo, teclado, erro, recuperação e limpeza de caches entre identidades.
- Nove testes de integração passaram com DATABASE_TEST_URL em PostgreSQL/PostGIS
  exclusivo (`oto_auth_final_test`), migrations reais e nenhum teste ignorado.
  Incluem fluxo HTTP, bootstrap controlado, contas do mesmo perfil independentes,
  código expirado/reutilizado, concorrência de ativação, desativação, recuperação,
  limite 429 e preservação do grafo/seed existentes.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
--exit-code`: nenhuma diferença. A versão final da migration foi aplicada desde
  uma base nova, sem reset de banco existente.

Não foi executada homologação visual em dispositivo real nem declarada aprovação do
OTO/CI remota. Próximo incremento: parte 03, com matriz de permissões aprovada, gestão
autenticada de contas/vínculos e negação por padrão nas operações de negócio.
Manter HTTPS, retenção e acesso ao comando administrativo no plano operacional 21.

## Acesso fictício para demonstração local

O desenvolvedor autorizou um administrador compartilhado apenas no mock local. A
[fixture de acesso](../../fixtures/oto/acesso-demo.json) referencia o usuário fictício
existente; `pnpm db:seed` habilita sua senha como hash, com guardas de ambiente/banco.
Marcador independente permite atualizar massas anteriores sem alterar o hash do
cenário e sem restaurar senhas revogadas/alteradas ou contas inativas. A autenticação
real e o procedimento de contas de produção permanecem separados dessa demonstração.

Nesta complementação passaram 16 testes unitários do backend e 11 de integração
com PostgreSQL/PostGIS isolado e migrations reais. A carga foi executada duas vezes
e o administrador fictício passou por login HTTP 201, consulta de sessão 200 e logout
204 na API real. Foram conferidos tipos, build, lint, formatação e referências/hashes.
O banco de demonstração usado na verificação foi exclusivo e descartado após os testes.

## Refatoração dos formulários com TanStack Form

Login e ativação usam TanStack Form (`@tanstack/react-form`) e o hook compartilhado
`useAppForm`, com valores, validação, metadados e submissão controlados pelo formulário.
O `FormInput` reutilizável compõe Input/Label shadcn/ui e oferece descrição, erros
acessíveis, associação ARIA e suporte a ref/atributos nativos. Regras de e-mail, senha
e código permanecem na página; submissões aguardam as mutations React Query existentes.

Testes do frontend cobrem validação sem chamada HTTP, espera e bloqueio de envio
duplicado, nova tentativa após falha, preservação do e-mail, limpeza de segredos,
teclado, blur, descrição/erro acessível e atributos/ref do componente compartilhado.
Esta refatoração não altera o contrato HTTP nem o schema; a evidência de integração
acima corresponde à implementação do plano 02, não a uma nova execução de banco.

## Atualização visual

A interface existente recebeu o [tema OTO e a navegação responsiva](interface-visual.md),
preservando os contratos e limites desta parte. Evidências e pendências estão no registro
da entrega visual; esta atualização não representa homologação de negócio.
