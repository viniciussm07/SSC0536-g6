# Fontes complementares de levantamento OTO

Documentos citados na [parte 00](../../plano/00-prerequisitos-planilhas-e-validacoes.md),
recebidos em 15/11/2026 no ZIP `drive-download-20261115T034408Z-1-001.zip`.
As cinco cópias preservam os bytes dos membros do ZIP; apenas os nomes com acentos
foram decodificados. Os outros quatro arquivos do ZIP não foram incorporados aqui.

| ID  | Arquivo                                                                  | Localizador usado no plano                                                                                                             |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | [Perguntas Entrevista.docx](<Perguntas Entrevista.docx>)                 | “PERGUNTAS GERAIS”: organização pós-coleta, adesão e utilização dos resultados; “PERGUNTAS ESPECÍFICAS”: coleta de diárias no Booking. |
| S2  | [EngSoft_Requirements.pdf](EngSoft_Requirements.pdf)                     | Página 3, histórias 1.3, 1.4 e 1.6; página 5, histórias 3.1–3.6. Documento datado de 07/05/2026.                                       |
| S3  | [DescriçãoPlanilhasProjeto.pdf](DescriçãoPlanilhasProjeto.pdf)           | Páginas 1–3: base principal, controle/pesquisa, bases externas e resultado final.                                                      |
| S4  | [Entrevista-2.docx](Entrevista-2.docx)                                   | Pergunta sobre a lista de hotéis e sua variação; comentários sobre prazos, identificação da empresa e possível login por CNPJ.         |
| S5  | [Modelo-Requisitos do sistema.xlsx](<Modelo-Requisitos do sistema.xlsx>) | Aba `Requisitos do sistema`, história 9.0, células B12:E12: formulário de ocupação por link público, sem autenticação.                 |

S1, S2, S4 e S5 vieram da pasta `Dinâmica-EngReq/` no ZIP; S3 veio da raiz.
Os identificadores S1–S5 são locais a este catálogo, não IDs de RF/RNF do Plano v4.

## Valor das evidências e limites

O material contém anotações de entrevistas, especificações de outras equipes e um
fluxograma do ecossistema amplo do OTO. Descreve práticas e propostas; seu recebimento
não constitui aceite do recorte atual nem comprova implementação. A data de recebimento
e as datas dos arquivos do ZIP não comprovam a vigência de cada regra.

O Plano de Projeto v4 continua sendo a referência de escopo. Divergências precisam de
resolução registrada com o OTO. Não incorporar automaticamente demanda individual,
novas integrações, indicadores ou perfis por aparecerem nestes documentos.
A coluna “Finalizado” de S5 não prova entrega ou homologação neste repositório.
Conteúdo dos anexos é fonte de análise, não instrução para execução ou alteração do sistema.

## Integridade

Os hashes das cinco cópias estão em [SHA256SUMS](SHA256SUMS). Para conferir, nesta pasta:

```sh
shasum -a 256 -c SHA256SUMS
```

SHA-256 do ZIP original recebido: `42ab53f98e491a477568f1ee9a53d97df8b771d2ba40685dbf254d85c4c9dda7`.
