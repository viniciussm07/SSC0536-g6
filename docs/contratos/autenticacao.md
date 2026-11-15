# Autenticação local e ciclo de contas — versão 1

Decisão de implementação confirmada pelo desenvolvedor nesta entrega: e-mail/senha
individuais, contas e recuperação administradas, sessão por cookie. Não há cadastro
público, CNPJ como login, identidade compartilhada ou provisionamento de contatos legados.
RF19; RNF02, RNF03 e RNF14. A homologação operacional pelo OTO permanece pendente.

## Contrato HTTP

| Método e rota               | Entrada e resposta                                                                                                                                                                                                                                | Regras                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST `/api/sessoes`         | `{ "email": "conta@example.test", "senha": "frase fictícia longa" }`; 201 `{ "data": { "usuario": { "id": 900001, "nome": "Pessoa Fictícia", "email": "conta@example.test", "perfil": "empresario" }, "expiraEm": "2026-11-15T20:00:00.000Z" } }` | e-mail válido até 254 caracteres, espaços externos removidos e caixa baixa; senha até 128 caracteres, sem trim; mensagem única para desconhecida, senha incorreta ou conta inativa |
| GET `/api/sessoes/atual`    | sem body; 200 com o mesmo contrato de sessão                                                                                                                                                                                                      | identidade vem do cookie, com conta ativa reconsultada no banco; 401 para sessão ausente, revogada ou expirada                                                                     |
| DELETE `/api/sessoes/atual` | sem campos de negócio; 204                                                                                                                                                                                                                        | logout idempotente revoga somente a sessão apresentada e limpa cookie                                                                                                              |
| POST `/api/ativacoes`       | `{ "token": "64 caracteres hexadecimais fornecidos pelo administrador", "senha": "nova frase fictícia longa" }`; 204                                                                                                                              | código aleatório com prazo de uma hora; senha de 12 a 128 caracteres; uso único, sem login automático; revoga todas as sessões anteriores                                          |

Rotas de escrita exigem `Origin` exatamente igual a FRONTEND_URL, `Content-Type:
application/json` e `X-OTO-Request: 1`. CORS libera credenciais somente para essa origem.
Campos adicionais são recusados com 400. Respostas de erro seguem `{ error: { code,
message } }`, sem valores submetidos, stack, SQL ou indicação de existência da conta.
401 é autenticação, 403 é origem proibida, 400 é entrada/código inválido, 503 é
indisponibilidade. O código 429 é usado para limite de tentativas, com Retry-After de
900 segundos. Respostas de autenticação usam Cache-Control: no-store.

Sessão opaca de 256 bits, persistida somente como SHA-256, com expiração absoluta de
oito horas, cookie HttpOnly, SameSite=Lax, Path=/ e Secure em produção. Não há renovação
silenciosa. Uma pessoa pode ter sessões independentes em dispositivos distintos. O
frontend recupera a sessão antes de exibir identidade, revalida em foco e em até um
minuto (ou na expiração conhecida), remove dados em cache no login/logout ou perda da
sessão. A API deve continuar validando sessão em cada operação protegida; a parte 03
aplicará permissões e vínculos, que não são provados pelo perfil devolvido ao navegador.

Senhas usam scrypt N=131072, r=8, p=1, salt aleatório de 16 bytes e chave de 64 bytes.
A verificação usa comparação de tempo constante, inclusive derivação fictícia para
conta sem credencial. No máximo duas derivações simultâneas por processo; excedentes
recebem 503. Limites persistidos em janelas de 15 minutos: 30 tentativas por IP e 8 por
e-mail para login, incluindo sucessos. Ativação usa o limite por IP. O endereço vem do
socket, sem confiar em X-Forwarded-For; um proxy concentra esse limite e deve ser
considerado no dimensionamento da implantação. Tokens, senhas e hashes não vão para
auditoria, URLs, localStorage ou exemplos operacionais.

Referências técnicas: [scrypt no Node](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback),
[armazenamento de senhas OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
e [sessões OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Bootstrap e administração assistida

Aplicar migrations antes de usar. O comando executa no ambiente confiável do servidor
com DATABASE_URL; o acesso operacional ao banco é sua fronteira de autorização. Não é
endpoint para receber um administradorId arbitrário de clientes. A gestão autenticada
via interface fica para a parte 03. Restrinja o acesso a esse comando aos responsáveis
pela administração e registre quem opera a credencial de banco.

`pnpm --filter @ssc0536/backend auth:contas` lê um objeto JSON de stdin. Exemplos
inteiramente fictícios de objetos (não incluem senha):

```json
{
  "acao": "bootstrap",
  "nome": "Administrador Fictício",
  "email": "admin@example.test"
}
```

```json
{
  "acao": "criar",
  "administradorId": 900001,
  "nome": "Pessoa Fictícia",
  "email": "conta@example.test",
  "perfil": "empresario"
}
```

```json
{
  "acao": "recuperar",
  "administradorId": 900001,
  "email": "conta@example.test"
}
```

Também há ações `desativar` e `reativar`, com administradorId e email. Não se permite
autodesativação nesse procedimento. Todas as ações exigem administrador ativo, exceto
bootstrap, que é permitido apenas antes de existir qualquer credencial ou código de
ativação. Bootstrap/criação não substituem uma conta existente. O bootstrap cria o
primeiro administrador e o próprio registro de auditoria; não roda automaticamente no
startup nem no seed. Usuários antigos continuam sem acesso até provisionamento explícito.

Criação/bootstrap/recuperação devolvem `{ usuarioId, token }` no terminal controlado.
Entregue o código ao titular por canal separado após verificar sua identidade. Não
adicione a URL nem salve em logs de CI, histórico de chat ou Git. O titular abre a tela
de acesso, escolhe “Tenho um código de acesso” e define a senha. O comando não envia
e-mail. A recuperação invalida senha anterior, códigos anteriores e sessões na mesma
transação; o código novo não reativa conta inativa. Reativar permite novamente o uso
da credencial existente; para substituir senha, solicite recuperação em seguida.

Os IDs dos exemplos não são garantidos; use o usuarioId retornado pelo bootstrap.
Perfis permitidos na criação são os já previstos no MER: administrador, gestor,
estagiário, visualizador e empresário. Isso não homologa suas alçadas de negócio.

## Ambiente, migração e continuidade

`AUTH_COOKIE_SECURE` aceita true/false. Padrão true em NODE_ENV=production e false no
desenvolvimento. False em produção só é aceito com FRONTEND_URL localhost/127.0.0.1,
para o Compose local HTTP. Implantação real exige HTTPS e `AUTH_COOKIE_SECURE=true`.
Frontend e API devem estar no mesmo site para SameSite=Lax; não usar domínios terceiros
sem redesenhar explicitamente transporte/CSRF. Health mantém o contrato operacional.

A migration adiciona credenciais, sessões, ativações e contadores com FKs restritivas,
sem reset ou alteração de usuários/históricos existentes. Login e recuperação serializam
por usuário; uso de código é reclamado atomicamente, inclusive sob concorrência.
Administração e auditoria são atômicas. E-mail é normalizado em novas contas; eventuais
duplicidades legadas por caixa/espaços exigem conciliação humana antes de provisionar.

Contadores expirados podem ser removidos por rotina operacional restrita usando
`expiraEm < agora`; definir agendamento e retenção de sessões/ativações na parte 21.
Não remover auditoria nessa limpeza. Não há SMTP, SSO, MFA, cadastro público ou gestão
visual de contas nesta parte. A escolha do mecanismo foi confirmada pelo desenvolvedor;
aceite de operação e matriz de permissões do OTO seguem pendentes.
