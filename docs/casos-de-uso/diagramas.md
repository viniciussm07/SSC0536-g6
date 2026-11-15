# Diagramas de casos de uso

Os diagramas usam `usecase-beta` do Mermaid 12. A hierarquia de atores aparece na
visão geral; para eliminar setas sobrepostas, os demais diagramas mostram um ator ou
um grupo pequeno de atores por vez. Casos compartilhados podem aparecer em mais de um
diagrama, mas cada identificador tem uma única linha na tabela do
[README](README.md#status-dos-casos).

> A sintaxe `usecase-beta` ainda é beta e pode não renderizar diretamente no GitHub.
> As imagens PNG e o PDF em `tmp/casos-de-uso-drive/` são a referência visual para o Drive.

## 00. Hierarquia de atores

Generalizações usadas nos diagramas. Os módulos e casos estão listados no README.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction TB
actor Visitante("Visitante")
actor Usuario("Usuário autenticado")
actor Equipe("Equipe OTO")
actor Admin("Administrador")
actor Gestor("Gestor")
actor Estagiario("Estagiário")
actor Visualizador("Visualizador")
actor Empresario("Empresário")
actor Operacao("Operação/CI")
actor BI("Consumidor de BI")

Equipe --|> Usuario
Admin --|> Equipe
Gestor --|> Equipe
Estagiario --|> Equipe
Visualizador --|> Usuario
Empresario --|> Usuario
```

## 01. Sessão e acesso próprio

Casos: UC-01 a UC-04 e UC-08.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Visitante("Visitante")
actor Usuario("Usuário autenticado")

systemBoundary b1["Autenticação e acesso próprio"]
  UC01("UC-01 Realizar login")
  UC02("UC-02 Consultar sessão atual")
  UC03("UC-03 Encerrar sessão")
  UC04("UC-04 Ativar conta com código")
  UC08("UC-08 Consultar próprio acesso")
end

Visitante --> UC01
Visitante --> UC04
Usuario --> UC02
Usuario --> UC03
Usuario --> UC08
```

## 02. Administração de acesso e auditoria

Casos: UC-05 a UC-07, UC-09 a UC-11 e UC-36.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Admin("Administrador")

systemBoundary b1["Contas, permissões e auditoria"]
  UC05("UC-05 Gerar código de recuperação")
  UC06("UC-06 Provisionar conta")
  UC07("UC-07 Gerenciar conta")
  UC09("UC-09 Gerenciar vínculos")
  UC10("UC-10 Configurar permissões de perfil")
  UC11("UC-11 Configurar visibilidade de indicadores")
  UC36("UC-36 Consultar auditoria de alterações")
end

Admin --> UC05
Admin --> UC06
Admin --> UC07
Admin --> UC09
Admin --> UC10
Admin --> UC11
Admin --> UC36
```

## 03. Contexto do empreendimento

Caso: UC-12.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Equipe("Equipe OTO")
actor Empresario("Empresário")

systemBoundary b1["Contexto do empreendimento"]
  UC12("UC-12 Selecionar empreendimento contextual")
end

Equipe --> UC12
Empresario --> UC12
```

## 04. Cadastro — Equipe OTO

Casos: UC-13 a UC-17, UC-19 e UC-20.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Equipe("Equipe OTO")

systemBoundary b1["Cadastro de empreendimentos"]
  UC13("UC-13 Consultar empreendimentos")
  UC14("UC-14 Consultar ficha do empreendimento")
  UC15("UC-15 Cadastrar empreendimento")
  UC16("UC-16 Editar empreendimento")
  UC17("UC-17 Encerrar ou reativar empreendimento")
  UC19("UC-19 Consultar contatos e Cadastur")
  UC20("UC-20 Consultar respostas do empreendimento")
end

Equipe --> UC13
Equipe --> UC14
Equipe --> UC15
Equipe --> UC16
Equipe --> UC17
Equipe --> UC19
Equipe --> UC20
```

## 05. Catálogo e inventário — Equipe OTO

Casos: UC-21, UC-22, UC-26 a UC-31.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Equipe("Equipe OTO")

systemBoundary b1["Catálogo"]
  UC21("UC-21 Consultar catálogo do segmento")
  UC22("UC-22 Validar respostas do catálogo")
end

systemBoundary b2["Inventário versionado"]
  UC26("UC-26 Consultar inventário vigente")
  UC27("UC-27 Consultar histórico")
  UC28("UC-28 Consultar detalhe e diferenças")
  UC29("UC-29 Registrar nova versão")
  UC30("UC-30 Corrigir versão")
  UC31("UC-31 Conferir versão")
end

Equipe --> UC21
Equipe --> UC22
Equipe --> UC26
Equipe --> UC27
Equipe --> UC28
Equipe --> UC29
Equipe --> UC30
Equipe --> UC31
UC22 ..> : include UC21
UC29 ..> : include UC26
```

## 06. Exportação e importação

Casos: UC-18, UC-37 e UC-38.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Admin("Administrador")
actor Gestor("Gestor")

systemBoundary b1["Exportação"]
  UC18("UC-18 Exportar empreendimentos")
end

systemBoundary b2["Importação"]
  UC37("UC-37 Enviar e ler arquivo")
  UC38("UC-38 Conciliar e persistir importação")
end

Admin --> UC18
Gestor --> UC18
Admin --> UC37
Gestor --> UC37
Admin --> UC38
Gestor --> UC38
```

## 07. Catálogo — Administrador

Casos: UC-23 a UC-25.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Admin("Administrador")

systemBoundary b1["Gestão de catálogo"]
  UC23("UC-23 Gerenciar grupos de catálogo")
  UC24("UC-24 Gerenciar itens de catálogo")
  UC25("UC-25 Consultar histórico de versões")
end

Admin --> UC23
Admin --> UC24
Admin --> UC25
```

## 08. Cadastro — Empresário

Casos: UC-13, UC-14, UC-16, UC-19 e UC-20.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Empresario("Empresário")

systemBoundary b1["Cadastro do próprio empreendimento"]
  UC13("UC-13 Consultar empreendimentos")
  UC14("UC-14 Consultar ficha do empreendimento")
  UC16("UC-16 Editar empreendimento")
  UC19("UC-19 Consultar contatos e Cadastur")
  UC20("UC-20 Consultar respostas do empreendimento")
end

Empresario --> UC13
Empresario --> UC14
Empresario --> UC16
Empresario --> UC19
Empresario --> UC20
```

## 09. Catálogo e inventário — Empresário

Casos: UC-21, UC-22, UC-26 a UC-30.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Empresario("Empresário")

systemBoundary b1["Catálogo"]
  UC21("UC-21 Consultar catálogo do segmento")
  UC22("UC-22 Validar respostas do catálogo")
end

systemBoundary b2["Inventário do próprio empreendimento"]
  UC26("UC-26 Consultar inventário vigente")
  UC27("UC-27 Consultar histórico")
  UC28("UC-28 Consultar detalhe e diferenças")
  UC29("UC-29 Registrar nova versão")
  UC30("UC-30 Corrigir versão")
end

Empresario --> UC21
Empresario --> UC22
Empresario --> UC26
Empresario --> UC27
Empresario --> UC28
Empresario --> UC29
Empresario --> UC30
UC22 ..> : include UC21
UC29 ..> : include UC26
```

## 10. Pesquisas e comunicação

Casos: UC-39 a UC-43.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Equipe("Equipe OTO")
actor Empresario("Empresário")

systemBoundary b1["Pesquisas e comunicação"]
  UC39("UC-39 Gerenciar períodos e calendário")
  UC40("UC-40 Gerenciar modelos e versões de pesquisa")
  UC41("UC-41 Publicar, encerrar e controlar respondentes")
  UC42("UC-42 Responder pesquisa e acompanhar painel")
  UC43("UC-43 Notificar e registrar preferência de boletim")
end

Equipe --> UC39
Equipe --> UC40
Equipe --> UC41
Empresario --> UC42
Empresario --> UC43
```

## 11. Indicadores — consulta

Casos: UC-32 e UC-33.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Admin("Administrador")
actor Gestor("Gestor")
actor Visualizador("Visualizador")

systemBoundary b1["Consulta de indicadores"]
  UC32("UC-32 Consultar indicadores autorizados")
  UC33("UC-33 Exportar indicadores")
end

Admin --> UC32
Admin --> UC33
Gestor --> UC32
Gestor --> UC33
Visualizador --> UC32
```

## 12. Indicadores — metodologia e cálculo

Casos: UC-44 a UC-46 e UC-48.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Equipe("Equipe OTO")

systemBoundary b1["Metodologia e cálculo"]
  UC44("UC-44 Definir metodologia dos indicadores")
  UC45("UC-45 Calcular, recalcular e rastrear resultados")
  UC46("UC-46 Incorporar diárias, RHC e fontes complementares")
  UC48("UC-48 Avaliar previsão estatística experimental")
end

Equipe --> UC44
Equipe --> UC45
Equipe --> UC46
Equipe --> UC48
UC45 ..> : include UC44
```

## 13. Operação e consumo

Casos: UC-34, UC-35, UC-47 e UC-49.

```mermaid
---
config:
  theme: base
  themeVariables:
    primaryColor: "#e8f1ff"
    primaryBorderColor: "#1d4ed8"
    primaryTextColor: "#0f172a"
    lineColor: "#334155"
    textColor: "#0f172a"
    usecaseActorBkg: "#fff7ed"
    usecaseActorBorder: "#c2410c"
    usecaseBkg: "#e8f1ff"
    usecaseBorder: "#1d4ed8"
    usecaseBoundaryBkg: "#ffffff"
    usecaseBoundaryBorder: "#94a3b8"
  look: classic
  layout: elk
---
usecase-beta
direction LR
actor Operacao("Operação/CI")
actor BI("Consumidor de BI")

systemBoundary b1["Operação"]
  UC34("UC-34 Verificar saúde da API/banco")
  UC35("UC-35 Preparar ambiente de dados")
  UC49("UC-49 Implantar, operar e recuperar")
end

systemBoundary b2["Consumo"]
  UC47("UC-47 Consultar dashboards e gerar boletins")
end

Operacao --> UC34
Operacao --> UC35
Operacao --> UC49
BI --> UC47
```
