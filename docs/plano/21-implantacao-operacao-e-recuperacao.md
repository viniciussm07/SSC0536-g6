# 21 — Implantação, operação, observabilidade e recuperação

**Situação:** POC publicada em VPS com HTTPS, backup local diário e restauração verificada;
backup externo automático e aceite operacional permanecem pendentes.

**Rastreabilidade:** RNF02–RNF07, RNF09, RNF10, RNF13 e RNF14; seções 4.1 e 7.

**Dependências:** [00](00-prerequisitos-planilhas-e-validacoes.md), [20](20-qualidade-testes-e-homologacao.md)

## Fontes locais para esta parte

Consultar o [catálogo de planilhas](../planilhas/README.md).

O catálogo de fontes descreve os arquivos de referência. Separar esses esqueletos das futuras cargas operacionais; definir armazenamento, configuração e recuperação conforme o ambiente implantado, sem tratar o ZIP como backup de produção.

## Objetivo e execução transversal

Preparar homologação durante o desenvolvimento e uma entrega operável pela equipe responsável.
A primeira preparação de ambiente acompanha o primeiro incremento; a liberação final depende
das validações dos fluxos implantados. A escolha do ambiente requer acordo com OTO/TI.

## Homologação e publicação

- Definir infraestrutura, domínio, identidade institucional, acesso administrativo e
  responsabilidades de operação. Validar HTTPS/TLS e necessidade/topologia de VPN prevista
  na proposta tecnológica; não presumir que Docker sozinho atende a segurança de publicação.
- Separar desenvolvimento, teste, homologação e produção, dados, credenciais e volumes.
- Substituir Vite de desenvolvimento por build estático servido adequadamente na implantação;
  o script atual de inicialização é destinado ao uso local.
- Preparar imagens reproduzíveis, configuração por ambiente, gestão de segredos, rede privada
  do banco e usuário de aplicação com permissões necessárias. Não publicar credenciais de exemplo.
- Definir pipeline de release, aplicação de migrations, backup anterior a mudanças relevantes,
  compatibilidade de versões e estratégia de reversão/restauração.
- Tratar a proteção da migration atual contra remoção da tabela `User` preenchida; se houver
  usuários legados, planejar conversão explícita sem reset para contornar o bloqueio.

## Operação de serviços e dados

- Definir execução de jobs de importação, aviso, fechamento e cálculo, com status,
  idempotência, recuperação de falha e supervisão; evitar jobs perdidos com reinício do processo.
- Instrumentar saúde, logs estruturados sem segredos, correlação de requisição/lote/cálculo
  e alertas acionáveis. Registro operacional não substitui auditoria de negócio.
- Definir limites de upload/processamento e metas de disponibilidade/desempenho com dados reais.
- Definir retenção e proteção de arquivos originais, amostras e relatórios de erro.

## Backup e recuperação

Acordar com OTO/TI frequência, retenção, armazenamento, controle de acesso, objetivo de perda
máxima de dados e prazo de recuperação. Incluir banco com PostGIS, arquivos necessários à
rastreabilidade e configurações recuperáveis, sem misturar backups e segredos sem proteção.
Executar restauração real em ambiente isolado e conferir inventários, respostas e indicadores.
Volume Docker persistente não é backup; manter o volume ao parar não demonstra recuperação.

## Entregáveis e critérios de aceite

- Homologação acessível ao público autorizado, com HTTPS e isolamento de dados.
- Runbook de instalação, atualização, migração, incidente, restauração e encerramento.
- Release identificável com versão de aplicação e migrations; nenhuma senha de exemplo publicada.
- Reinício/falha não perde tarefa confirmada nem publica cálculo incompleto.
- Backup restaurado com evidência e testes de integridade; metas acordadas verificadas.
- Documentação de uso por perfil, limitações, contatos responsáveis e transferência de operação.

## Preparação técnica da POC

- [Runbook de VPS](../../deploy/README.md) e Compose exclusivo de produção com frontend
  compilado, Caddy/HTTPS, API e PostgreSQL/PostGIS, sem portas públicas de banco/API.
- Inicialização gera credenciais distintas, preserva configuração existente e não executa seed.
  Migrations e permissões são aplicadas antes de iniciar a API com papel sem propriedade
  de tabelas; auditoria permite somente SELECT/INSERT para a aplicação.
- Volumes persistentes, rotação de logs e comando de dump local foram preparados.
  Backup externo, agendamento, restauração comprovada e publicação dependem do ambiente.
- O limite de autenticação por IP concentra clientes no proxy; a limitação está explícita
  no runbook e deve ser revista antes de ampliar o público da POC.
- Esta preparação não comprova homologação, VPN, disponibilidade, nem aceite do OTO.

### Evidências locais de verificação

- Imagens de backend, frontend e PostgreSQL/PostGIS construídas; Compose isolado em
  banco `oto_deploy_test`, sem acesso ao volume de desenvolvimento.
- Migrations e concessões concluídas; API saudável via HTTPS local do Caddy e rota
  interna da SPA retornando HTML com status 200. Certificado público depende do DNS real.
- Bootstrap fictício, ativação, login, cookie Secure/HttpOnly, consulta da sessão e da
  auditoria e logout verificados via proxy. Usuário runtime sem superuser/createdb/createrole
  e sem UPDATE/DELETE/TRUNCATE na auditoria.
- Dump restaurado em `oto_restore_test`; contagens de usuários e auditoria preservadas.
  Isso verifica o procedimento local, não o backup externo da VPS.
- `pnpm validate:repo`, formatação dos arquivos alterados, sintaxe Bash e `git diff --check`
  aprovados. Não houve alteração de regras de negócio ou schema.

### Implantação da POC em 15/11/2026

- Publicação em `https://oto.leol.dev` em Ubuntu 24.04, Docker/Compose oficiais,
  firewall TCP 22/80/443 e swap de 2 GB. Checkout operacional em `/opt/oto`.
- HTTPS público válido, redirecionamento HTTP 308, página inicial e rota interna com
  status 200; `/api/health` confirmou conexão ao banco.
- Sete migrations aplicadas; catálogo técnico carregado explicitamente (26 grupos,
  160 itens), sem seed de contas demonstrativas. Administrador solicitado provisionado
  por bootstrap; titular deve concluir a ativação e definir sua senha.
- Backup diário local via systemd (`oto-backup.timer`, 03:00 UTC com atraso de até
  10 minutos). Dump restaurado em banco exclusivo de teste na VPS, com contagens de
  usuários, auditoria e catálogo preservadas. Banco restaurado mantido para conferência.
- Papel runtime sem superuser/createdb/createrole nem UPDATE/DELETE/TRUNCATE na auditoria.
- A rotina ainda não envia backups a destino externo. Definir destino autorizado,
  criptografia, retenção e alertas; o backup no mesmo servidor não cobre perda da VPS.
- Não houve homologação do OTO, validação de capacidade com carga real nem execução
  remota de GitHub Actions por esta publicação.

### Pipeline de publicação após PR

- Workflow `Deploy da POC` preparado para aguardar CI aprovado do commit integrado à
  `main`, confirmar associação com PR merged e ignorar commits já superados.
- Deploy serializado no Actions e na VPS, release identificada pelo SHA, configuração
  e backups preservados, backup obrigatório antes das migrations e verificações HTTPS.
- Receptor instalado na VPS com chave SSH exclusiva restrita a deploy/check; secrets
  `OTO_DEPLOY_SSH_KEY` e `OTO_DEPLOY_KNOWN_HOSTS` cadastrados no repositório.
- Cinco testes isolados do receptor aprovados em Python 3.12 na VPS: comandos permitidos,
  ordem backup/publicação, repetição da mesma versão, bloqueio após falha de backup e
  rejeição de caminhos, links e arquivos de segredo. O CI passa a executá-los.
- Ativação do workflow depende de integrar os arquivos na `main`. Cadastro de secrets e
  teste do comando SSH não comprovam execução do workflow remoto ou deploy por Actions.
- Backups permanecem somente na VPS por decisão do responsável. Rollback de migrations,
  alertas externos, retenção automática e backup externo não são entregues pela pipeline.

- Verificações desta alteração: `actionlint` 1.7.12 sem erros nos workflows CI/deploy,
  `pnpm format:check`, `pnpm validate:repo`, sintaxe Bash e `git diff --check` aprovados.
  Handshake `check` com a chave restrita respondeu com sucesso; nenhum deploy por Actions
  foi disparado por estes testes.

- CI limitado a pushes na `main`, eventos de PR e execução manual: evita duplicar
  validações de push/PR nas branches de trabalho e preserva o gatilho pós-merge do deploy.
