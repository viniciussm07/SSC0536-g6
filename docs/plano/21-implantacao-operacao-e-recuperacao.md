# 21 — Implantação, operação, observabilidade e recuperação

**Situação:** planejado; não implementado por este documento.

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
