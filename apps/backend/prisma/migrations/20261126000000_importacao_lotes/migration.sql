-- Parte 08: lotes, original, linhas brutas e ocorrências da leitura de planilhas.
-- Não toca tabelas de negócio; conciliação e persistência pertencem à parte 09.

-- CreateTable
CREATE TABLE "importacao_lote" (
    "id" SERIAL NOT NULL,
    "fonte" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "versao_parser" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "criado_por" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lido_em" TIMESTAMP(6),
    "erro_mensagem" TEXT,
    "resumo" JSONB,

    CONSTRAINT "importacao_lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacao_arquivo" (
    "lote_id" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,

    CONSTRAINT "importacao_arquivo_pkey" PRIMARY KEY ("lote_id")
);

-- CreateTable
CREATE TABLE "importacao_linha" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "aba" TEXT NOT NULL,
    "linha" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "celulas" JSONB NOT NULL,
    "canonico" JSONB,

    CONSTRAINT "importacao_linha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacao_ocorrencia" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "aba" TEXT,
    "linha" INTEGER,
    "coluna" TEXT,
    "severidade" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "orientacao" TEXT NOT NULL,

    CONSTRAINT "importacao_ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importacao_lote_criado_em_id_idx" ON "importacao_lote"("criado_em", "id");

-- CreateIndex
CREATE INDEX "importacao_lote_criado_por_idx" ON "importacao_lote"("criado_por");

-- CreateIndex
CREATE UNIQUE INDEX "importacao_lote_fonte_sha256_key" ON "importacao_lote"("fonte", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "importacao_linha_lote_id_aba_linha_key" ON "importacao_linha"("lote_id", "aba", "linha");

-- CreateIndex
CREATE INDEX "importacao_ocorrencia_lote_id_severidade_idx" ON "importacao_ocorrencia"("lote_id", "severidade");

-- AddForeignKey
ALTER TABLE "importacao_lote" ADD CONSTRAINT "importacao_lote_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_arquivo" ADD CONSTRAINT "importacao_arquivo_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "importacao_lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_linha" ADD CONSTRAINT "importacao_linha_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "importacao_lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_ocorrencia" ADD CONSTRAINT "importacao_ocorrencia_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "importacao_lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "importacao_lote"
  ADD CONSTRAINT "importacao_lote_estado_check"
  CHECK ("estado" IN ('recebido', 'lendo', 'lido', 'erro'));
ALTER TABLE "importacao_linha"
  ADD CONSTRAINT "importacao_linha_tipo_check" CHECK ("tipo" IN ('cabecalho', 'entrada')),
  ADD CONSTRAINT "importacao_linha_situacao_check" CHECK ("situacao" IN ('valida', 'aviso', 'erro'));
ALTER TABLE "importacao_ocorrencia"
  ADD CONSTRAINT "importacao_ocorrencia_severidade_check" CHECK ("severidade" IN ('erro', 'aviso'));
