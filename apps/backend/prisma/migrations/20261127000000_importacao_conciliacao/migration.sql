-- Parte 09: destino, decisões, correspondências reutilizáveis e proveniência da confirmação.
-- Nenhuma linha existente é reinterpretada; respostas só mudam por confirmação explícita.

-- AlterTable
ALTER TABLE "importacao_lote" ADD COLUMN     "confirmacao" TEXT NOT NULL DEFAULT 'nao_confirmado',
ADD COLUMN     "confirmado_em" TIMESTAMP(6),
ADD COLUMN     "confirmado_por" INTEGER,
ADD COLUMN     "pergunta_id" INTEGER,
ADD COLUMN     "pesquisa_id" INTEGER,
ADD COLUMN     "recalculo_pendente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "importacao_decisao" (
    "linha_id" INTEGER NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "empreendimento_id" INTEGER,
    "motivo" TEXT,
    "conflito" TEXT,
    "decidido_por" INTEGER NOT NULL,
    "decidido_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacao_decisao_pkey" PRIMARY KEY ("linha_id")
);

-- CreateTable
CREATE TABLE "importacao_correspondencia" (
    "id" SERIAL NOT NULL,
    "fonte" TEXT NOT NULL,
    "chave_nome" TEXT NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "criado_por" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacao_correspondencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacao_aplicacao" (
    "linha_id" INTEGER NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "resposta_id" INTEGER NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "regra" TEXT NOT NULL,
    "valor_anterior" DECIMAL,
    "valor_novo" DECIMAL NOT NULL,
    "confirmado_por" INTEGER NOT NULL,
    "confirmado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacao_aplicacao_pkey" PRIMARY KEY ("linha_id")
);

-- CreateIndex
CREATE INDEX "importacao_decisao_lote_id_idx" ON "importacao_decisao"("lote_id");

-- CreateIndex
CREATE INDEX "importacao_decisao_empreendimento_id_idx" ON "importacao_decisao"("empreendimento_id");

-- CreateIndex
CREATE INDEX "importacao_correspondencia_empreendimento_id_idx" ON "importacao_correspondencia"("empreendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "importacao_correspondencia_fonte_chave_nome_key" ON "importacao_correspondencia"("fonte", "chave_nome");

-- CreateIndex
CREATE INDEX "importacao_aplicacao_lote_id_idx" ON "importacao_aplicacao"("lote_id");

-- CreateIndex
CREATE INDEX "importacao_aplicacao_resposta_id_idx" ON "importacao_aplicacao"("resposta_id");

-- AddForeignKey
ALTER TABLE "importacao_lote" ADD CONSTRAINT "importacao_lote_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_lote" ADD CONSTRAINT "importacao_lote_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pesquisa_pergunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_lote" ADD CONSTRAINT "importacao_lote_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_decisao" ADD CONSTRAINT "importacao_decisao_linha_id_fkey" FOREIGN KEY ("linha_id") REFERENCES "importacao_linha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_decisao" ADD CONSTRAINT "importacao_decisao_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "importacao_lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_decisao" ADD CONSTRAINT "importacao_decisao_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_decisao" ADD CONSTRAINT "importacao_decisao_decidido_por_fkey" FOREIGN KEY ("decidido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_correspondencia" ADD CONSTRAINT "importacao_correspondencia_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_correspondencia" ADD CONSTRAINT "importacao_correspondencia_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_aplicacao" ADD CONSTRAINT "importacao_aplicacao_linha_id_fkey" FOREIGN KEY ("linha_id") REFERENCES "importacao_linha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_aplicacao" ADD CONSTRAINT "importacao_aplicacao_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "importacao_lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_aplicacao" ADD CONSTRAINT "importacao_aplicacao_resposta_id_fkey" FOREIGN KEY ("resposta_id") REFERENCES "resposta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_aplicacao" ADD CONSTRAINT "importacao_aplicacao_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pesquisa_pergunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacao_aplicacao" ADD CONSTRAINT "importacao_aplicacao_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "importacao_lote"
  ADD CONSTRAINT "importacao_lote_confirmacao_check"
  CHECK ("confirmacao" IN ('nao_confirmado', 'parcial', 'concluido')),
  ADD CONSTRAINT "importacao_lote_destino_check"
  CHECK (("pesquisa_id" IS NULL) = ("pergunta_id" IS NULL));
ALTER TABLE "importacao_decisao"
  ADD CONSTRAINT "importacao_decisao_tipo_check" CHECK ("tipo" IN ('vincular', 'rejeitar')),
  ADD CONSTRAINT "importacao_decisao_conflito_check" CHECK ("conflito" IS NULL OR "conflito" IN ('substituir', 'manter')),
  ADD CONSTRAINT "importacao_decisao_vinculo_check"
  CHECK (("tipo" = 'vincular') = ("empreendimento_id" IS NOT NULL));
ALTER TABLE "importacao_aplicacao"
  ADD CONSTRAINT "importacao_aplicacao_acao_check" CHECK ("acao" IN ('criar', 'atualizar', 'sem_mudanca'));
