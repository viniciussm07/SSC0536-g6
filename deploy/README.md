# Publicação da POC em VPS

Configuração para uma VPS de 1 vCPU/4 GB, Docker Engine e Compose v2.
O frontend é compilado e servido pelo Caddy; `/api` mantém o prefixo e vai ao Nest.
Só 80/443 são publicados. PostgreSQL/PostGIS e API usam a rede do Compose.
O Compose local da raiz permanece independente.

## Preparação do servidor

Em VPS Ubuntu 24.04 dedicada, `bash deploy/provision.sh` (root) instala Docker/Compose
pelo repositório oficial, configura 2 GB de swap se não houver swap e ativa UFW
permitindo TCP 22/80/443. Execute somente após confirmar que o SSH usa a porta 22 e
que não existem outros serviços públicos a preservar. Não altera senhas nem chaves SSH.

## Primeira publicação

1. Configure acesso SSH por chave e confirme uma segunda sessão antes de alterar SSH/firewall.
   Libere a porta SSH efetivamente usada e TCP 80/443 tanto no firewall da Hostinger
   quanto no sistema. Não desative autenticação existente antes de testar a chave.
2. Aponte o registro DNS A do domínio para o IPv4 público. Se usar AAAA, ele também
   deve apontar para a VPS e estar acessível. Confira se 80/443 estão livres.
3. Transfira o checkout para `/opt/oto` (sem node_modules, `.env` locais, backups ou `.git`).
   Não use `rsync --delete` sobre uma instalação existente. Não copie dados das planilhas
   para o banco. Execute os comandos abaixo no checkout da VPS:

```sh
bash deploy/oto.sh init oto.seudominio.com
bash deploy/oto.sh up
bash deploy/oto.sh ps
curl --fail https://oto.seudominio.com/api/health
```

`init` gera duas senhas aleatórias com 256 bits e permissões 600; repetir preserva
`deploy/.env`. Esse arquivo é segredo, não deve ir para Git ou para logs.
As senhas geradas em hexadecimal não precisam de escape na URL do banco.
Alterar POSTGRES_PASSWORD em volume inicializado não altera a senha do PostgreSQL;
faça rotação explícita no banco e na configuração em manutenção coordenada.

`up` compila sequencialmente para reduzir consumo, aplica migrations versionadas,
configura permissões e inicia a API antes do frontend. Falha em migration interrompe
sem resetar o banco. A migration com proteção da tabela legada `User` deve ser tratada
por conversão explícita se houver dados antigos. Não apague volumes para contornar falhas.

Caddy obtém e renova o certificado com DNS e portas corretos. Site e API compartilham
origem; o frontend usa `/api`, cookies Secure e FRONTEND_URL HTTPS.
Persistem os dados do banco, os certificados e a configuração do Caddy.
O usuário `oto_app` não é proprietário nem superusuário e só pode SELECT/INSERT
em auditoria. `oto_owner` é reservado a migrations, provisionamento e backup.
O acesso de root/Docker continua sendo privilegiado sobre todos os dados da VPS.

## Primeiro administrador

Crie no servidor um JSON temporário com permissão 600, contendo `acao: "bootstrap"`,
`nome` e `email` do responsável, conforme o [contrato de autenticação](../docs/contratos/autenticacao.md).
Execute em terminal privado:

```sh
bash deploy/oto.sh contas < /caminho/protegido/administrador.json
```

O código de ativação aparece nesse terminal; não o salve no chat, Git ou logs de CI.
No site, use “Tenho um código de acesso” para definir a senha. Remova o JSON temporário.
Não há conta/senha padrão e nenhum seed roda em produção.

## Catálogo inicial de hospedagem

Para habilitar o segmento e as perguntas já implementadas, execute a carga idempotente
de referência (sem pessoas, sem sobrescrever itens existentes):

```sh
bash deploy/oto.sh catalogos
```

O dicionário técnico v1 não é metodologia homologada; veja o
[contrato de catálogos](../docs/contratos/catalogos.md). Essa carga é explícita e
não carrega as contas ou senhas públicas das fixtures.

## Verificação e atualização

Confira health, login, logout, rota interna aberta diretamente no navegador e uma
operação de cadastro/inventário com sua auditoria. Reinicie os serviços e confira
persistência. O limite atual de autenticação por IP usa o socket: todos os clientes
atrás do Caddy compartilham 30 tentativas a cada 15 minutos. É aceitável apenas para
esta POC pequena; uma publicação com mais usuários exige configuração e testes de
proxy confiável antes de usar X-Forwarded-For.

Antes de atualizar, faça backup e guarde checkout/identificador da release anterior.
Transfira a nova versão e repita `up`. Opcionalmente exporte `RELEASE` com um identificador
(por exemplo, SHA do commit) para etiquetar imagens. Compilações locais usam `local`.
Em 4 GB, acompanhe `docker stats`, `free -h` e `df -h`; evite builds paralelos.

```sh
bash deploy/oto.sh backup
bash deploy/oto.sh up
bash deploy/oto.sh logs
```

Logs têm rotação (3 arquivos de até 10 MB por serviço). `stop` preserva volumes.
Não execute `docker compose down -v`. Não limpe imagens da release anterior antes
de verificar a nova. Reverter só a aplicação depende da compatibilidade do schema;
não há rollback automático de migrations.

## Backup e recuperação

`backup` produz dump PostgreSQL customizado em `deploy/backups`, com permissão restrita.
Para instalação em `/opt/oto`, os arquivos `oto-backup.service` e `oto-backup.timer`
agendam um dump diário às 03:00 UTC (00:00 de São Paulo), com atraso aleatório de até
10 minutos. Instale-os em `/etc/systemd/system` e habilite com
`systemctl enable --now oto-backup.timer`. Confira falhas com
`journalctl -u oto-backup.service` e acompanhe o espaço de disco; os dumps não são
expurgados automaticamente.

É apenas uma cópia local: configure cópia diária criptografada para destino externo,
retenção e alerta de falha. Nenhum destino externo está configurado por estes arquivos.
Guarde também a configuração de ambiente em cofre separado.

Teste restauração em outra instância PostgreSQL 17/PostGIS com banco exclusivo `_test`:

```sh
pg_restore --no-owner --no-acl --exit-on-error --dbname="$DATABASE_TEST_URL" /caminho/backup.dump
```

A instância de destino precisa ter PostGIS instalado e permitir criação da extensão.
Restaure em banco vazio, confira dados e auditoria e reaplique `permissions.sql` com
as credenciais daquele ambiente antes de conectar a API. Nunca teste restauração sobre
produção. Aceite operacional exige evidência de restauração e backup externo funcionando.

Referências: [padrões do Caddy](https://caddyserver.com/docs/caddyfile/patterns),
[ordem de inicialização do Compose](https://docs.docker.com/compose/how-tos/startup-order/).

## Deploy automático após merge na main

O workflow `.github/workflows/deploy.yml` aguarda a conclusão bem-sucedida do workflow
`CI` para um push na `main`. Antes de publicar, confirma via API do GitHub que o commit
continua sendo o topo da `main` e está associado a um PR já integrado nessa branch.
Fechar PR sem merge, CI com falha, branches diferentes e pushes sem PR integrado não
publicam. O arquivo do workflow precisa estar na `main` para receber `workflow_run`.

A publicação usa exatamente o SHA aprovado no CI. O runner envia somente arquivos
versionados necessários ao build; segredos locais, fixtures e documentos de referência
não entram no pacote. Uma chave SSH própria, com comando forçado e sem forwarding/PTY,
permite apenas `check` e `deploy <sha>`. O host SSH é fixado pela chave já conferida da VPS.
Secrets cadastrados no repositório `viniciussm07/SSC0536-g6`:

- `OTO_DEPLOY_SSH_KEY`: chave privada exclusiva do Actions.
- `OTO_DEPLOY_KNOWN_HOSTS`: chave pública do host VPS previamente validada.

Os secrets não contêm senha de banco ou chave SSH pessoal. A chave exclusiva autoriza
publicar código na VPS como root; restrinja quem pode modificar e integrar workflows e
código na `main`. O job usa o environment `production`; não configure aprovação obrigatória
nesse environment se quiser publicação automática sem intervenção.

O receptor instalado em `/usr/local/sbin/oto-ci-deploy` serializa deploys com `flock`,
rejeita comandos arbitrários, caminhos inválidos, segredos e links no tar. Cada tentativa
é extraída em `/opt/oto/releases/<sha>.<sufixo>`, preservando tentativas anteriores.
Configuração e backups continuam em `/opt/oto/deploy/.env` e `/opt/oto/deploy/backups`.
Antes das migrations ele executa backup local; se falhar, não inicia a publicação.
Depois do build, migrations, permissões e verificações HTTPS, registra o SHA em
`/opt/oto/current-release` e aponta `/opt/oto/current` para a release publicada.

GitHub e VPS impedem deploys simultâneos; uma execução em publicação não é cancelada
por um merge posterior. Releases superadas aguardando publicação são ignoradas.
Uma falha aparece no Actions; não há reversão automática do schema. Se uma falha ocorrer
após atualizar containers, confira a saúde e compatibilidade antes de voltar uma imagem.

Para operar manualmente a versão instalada pela pipeline:

```sh
cd /opt/oto/current
export RELEASE="$(cat /opt/oto/current-release)"
bash deploy/oto.sh ps
bash deploy/oto.sh backup
bash deploy/oto.sh logs
```

O backup diário mantém o agendamento anterior e continua apenas na VPS, conforme a
preferência do responsável. Monitore espaço usado por dumps, imagens e releases;
esta pipeline não apaga dados, backups ou versões antigas automaticamente.

Para atualizar o próprio receptor, use a chave SSH administrativa (a chave do Actions
não permite alterar o comando forçado) e instale o arquivo revisado com proprietário
root e modo 700. A chave privada de configuração local fica em
`deploy/.env.github-actions-key`, modo 600 e ignorada pelo Git; nunca a inclua em commits.
Para revogar, remova somente a linha `oto-github-actions` de `authorized_keys` e os
secrets correspondentes no GitHub, preservando o acesso administrativo.

Validação do receptor (Python 3.12+; também executada pelo CI):

```sh
python3 deploy/test_ci_receiver.py
```

Referência: [evento workflow_run do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).
