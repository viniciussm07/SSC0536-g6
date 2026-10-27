# Gestão da Qualidade e Critérios de Aceitação — OTO

Documento derivado exclusivamente da `tmp/transcricao-whisperx.md` (entrevista, referência `E mm:ss`) e de `tmp/OTO_Consolidacao_de_Requisitos v1.pdf` (requisitos `RF`, `RNF`, `RN`). Não introduz limites numéricos ou regras que não constem dessas fontes; onde faltam parâmetros, o item é marcado como **a validar com o OTO**.

Escopo da primeira entrega: meios de hospedagem (hotelaria), conforme RF04 e E 03:17–03:41.

## 1. Objetivo

Definir como a equipe garante a qualidade das entregas e como o cliente (OTO) aceita formalmente cada incremento, com critérios verificáveis e rastreáveis aos requisitos levantados na entrevista.

## 2. Dimensões da qualidade

| Dimensão | O que avalia | Sustentação |
|---|---|---|
| Dado | Completude, validade, consistência, unicidade e histórico | RF05, RF06, RF08, RN05; E 28:20–29:53 |
| Funcional | Aderência aos RF01–RF38 | Requisitos consolidados |
| Não funcional | Aderência aos RNF01–RNF12 | Requisitos consolidados |
| Uso/adoção | Simplicidade de preenchimento e confiança institucional | RNF01, RNF12; E 17:19, E 19:43–21:36 |
| Processo | Ausência de retrabalho manual e propagação automática | RF07, RF18, RF26; E 48:52–50:39 |

## 3. Papéis

- **Equipe de desenvolvimento** — garante a qualidade (revisão, testes, evidências) antes de submeter o incremento.
- **OTO** — valida regra de negócio, fornece massa de referência (planilhas/tabulações) e assina o aceite.
- **Equipe de TI da Prefeitura** — valida infraestrutura e hospedagem, quando aplicável (E 46:32–48:06).

## 4. Critérios de aceitação

Formato: *Dado / Quando / Então*. Cada critério tem método de verificação e status.

Legenda de status: **Pronto** (verificável com as fontes atuais) · **Dependente do OTO** (precisa de insumo do cliente) · **A validar** (parâmetro ainda não definido).

| ID | Critério de aceitação | Requisito | Método | Status |
|---|---|---|---|---|
| CA01 | Dado um empresário autenticado, quando acessa o painel, então vê e altera somente os dados do próprio empreendimento; acesso a outro empreendimento é negado. | RF32; E 39:48–40:14 | Teste de autorização por perfil | Pronto |
| CA02 | Dado o formulário de inventário, quando um campo obrigatório está vazio, então o envio é bloqueado; quando aplicável, aceita `0` e `não se aplica` como resposta válida. | RF05, RF06, RN05; E 28:20–29:53 | Teste funcional com casos de borda | Pronto |
| CA03 | Dado que leitos/UH são alterados no cadastro central, quando a alteração é salva, então todos os indicadores dependentes refletem o novo valor sem edição manual em outra planilha. | RF07, RF26, RNF09; E 48:52–50:39 | Teste de integração de dados | Pronto |
| CA04 | Dado um modelo de pesquisa anterior, quando um usuário autorizado cria nova edição, então apenas o período de referência é alterado e a estrutura de perguntas é preservada. | RF11, RN04; E 26:56–28:05 | Inspeção + teste funcional | Pronto |
| CA05 | Dado que o prazo da pesquisa venceu, quando um empresário tenta responder, então a resposta é rejeitada e a lista de respondentes válidos não muda. | RF16, RF17; E 18:43–19:43 | Teste funcional | Pronto |
| CA06 | Dada uma resposta enviada por empresário autenticado, quando registrada, então fica vinculada ao empreendimento correspondente. | RF12, RF13; E 17:19–18:39 | Teste funcional | Pronto |
| CA07 | Dada qualquer alteração de dados, quando concluída, então o sistema registra usuário, data e hora, permitindo rastrear o autor. | RF35, RNF10; E 40:54–42:38 | Teste de auditoria | Pronto |
| CA08 | Dado um período já fechado, quando o sistema calcula ocupação, fluxo/pernoites e ticket médio, então os resultados conferem com a planilha oficial de tabulação do OTO, admitindo-se apenas diferença de arredondamento. | RF22, RF23, RN06, RN07, RN08; E 31:20–37:24 | Teste de dados contra *golden dataset* | Dependente do OTO |
| CA09 | Dado um empresário sem treinamento, quando preenche a pesquisa de ocupação, então conclui em até 1 minuto, mantendo a simplicidade do fluxo atual. | RNF01; E 17:19 | Teste de usabilidade cronometrado | Pronto |
| CA10 | Dado cada perfil (administrador, gestor, estagiário/pesquisador, visualizador, empresário), quando autenticado, então suas alçadas correspondem ao definido com o OTO. | RF31–RF34; E 38:15–39:56 | Teste de matriz de permissões | A validar |
| CA11 | Dado que um formulário evoluiu, quando o histórico é consultado, então períodos anteriores permanecem acessíveis e comparáveis. | RF08, RF27, RNF11; E 26:56–28:05 | Teste de consulta histórica | Pronto |
| CA12 | Dado um cenário de falha, quando a recuperação é executada, então os dados são restaurados e o backup é demonstrável conforme política do OTO. | RNF05 | Simulação de restauração | A validar |

### 4.1 Itens ainda sem critério mensurável

- **Desempenho (RNF04)** — limites numéricos não definidos; critério a validar com o OTO.
- **Disponibilidade e backup** — política não fornecida; CA12 permanece a validar.
- **Fórmulas oficiais de ocupação, pernoites/fluxo e ticket médio** — necessárias para fechar CA08.
- **Canal de notificação e distribuição de boletim (RF15, RF19)** — manter o fluxo atual ou definir novo canal.

## 5. Aceite por incremento

Cada entrega parcial segue o mesmo rito:

1. **Demonstração** do incremento pela equipe.
2. **Roteiro de UAT** com os critérios aplicáveis da seção 4.
3. **Evidências** anexadas (resultados de teste, capturas, saída do *golden dataset*, registro de auditoria).
4. **Checklist de aceite** preenchido item a item (`Aceito` / `Aceito com ressalva` / `Rejeitado`).
5. **Ata de aceite** assinada pelo OTO, com data e pendências.

Critério de rejeição: qualquer CA obrigatório do incremento não atendido, ou divergência em CA08 acima da tolerância acordada.

## 6. Matriz de rastreabilidade

| Origem | Critérios correspondentes |
|---|---|
| RF01–RF08 (inventário) | CA01, CA02, CA03, CA11 |
| RF09–RF20 (pesquisas) | CA04, CA05, CA06, CA09 |
| RF21–RF29 (dados e indicadores) | CA03, CA08, CA11 |
| RF30–RF35 (usuários e rastreabilidade) | CA01, CA07, CA10 |
| RF36–RF38 (ingestão e qualidade) | CA02, CA03, CA08 |
| RNF01, RNF09–RNF12 | CA03, CA07, CA09, CA11 |
| RNF04, RNF05 | CA12 (a validar) |
| RN01–RN08 | CA02, CA04, CA08 |

A planilha de rastreabilidade detalhada deve registrar, por critério: requisito, método, evidência, responsável e status.

## 7. Massa de referência (*golden dataset*)

- Selecionar um período já encerrado (ex.: setembro) e usar a planilha de tabulação oficial do OTO como referência de CA08.
- Não usar o formulário de inventário legado como baseline de aceite, pois ele é reconhecido como desatualizado e fora de sequência lógica (E 45:03–45:59).
- Registrar a versão da planilha e a data de referência usadas em cada aceite.

## 8. Adoção não é gate de aceite

A adesão dos empresários (quantidade e tempestividade das respostas, E 18:39–18:43) é um **indicador de resultado**, não um critério de aceitação do sistema. O aceite avalia o comportamento da plataforma, não o engajamento externo.

## 9. Não conformidades e reentrega

- Registrar cada não conformidade com CA, evidência, responsável e prazo.
- Corrigir e submeter novamente ao mesmo critério.
- Reemitir ata de aceite apenas após validação da correção.

## 10. Pendências bloqueantes (herdadas da consolidação)

- Formulários atuais de inventário hoteleiro e de pesquisas (Expectativa e Consolidado), com campos e obrigatoriedade.
- Planilha de inventário, planilha de tabulação e regra oficial de cálculo de ocupação, pernoites/fluxo e ajustes metodológicos.
- Perfis da primeira versão e critérios de publicação de indicadores — atenção à divergência entre os 5 perfis citados na entrevista e o agrupamento em 3 do RF31.
- Confirmação de login por CNPJ (sugestão, não regra aprovada — FC06).
- Infraestrutura e política de hospedagem com a TI da Prefeitura.
- Critérios mensuráveis de desempenho, disponibilidade, backup, integridade e segurança.
