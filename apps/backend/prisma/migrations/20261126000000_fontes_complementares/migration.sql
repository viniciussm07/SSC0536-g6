-- Proveniência e conferência das fontes complementares (diária, RHC e parâmetros).
-- Campos novos recebem default para preservar a massa fictícia já carregada.
BEGIN;

ALTER TABLE "coleta_diaria"
  ADD COLUMN "moeda" TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN "unidade_preco" TEXT NOT NULL DEFAULT 'por_uh_diaria',
  ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "situacao_conferencia" TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN "referencia_origem" TEXT,
  ADD COLUMN "observacao" TEXT,
  ADD COLUMN "conferido_em" TIMESTAMP(6),
  ADD COLUMN "conferido_por_usuario_id" INTEGER;

ALTER TABLE "rhc_periodo"
  ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "situacao_conferencia" TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN "revisao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "observacao" TEXT,
  ADD COLUMN "conferido_em" TIMESTAMP(6),
  ADD COLUMN "conferido_por_usuario_id" INTEGER;

ALTER TABLE "parametro_calculo"
  ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'indefinida',
  ADD COLUMN "situacao" TEXT NOT NULL DEFAULT 'hipotese_pendente_homologacao',
  ADD COLUMN "observacao" TEXT;

CREATE INDEX "coleta_diaria_conferido_por_usuario_id_idx"
  ON "coleta_diaria"("conferido_por_usuario_id");

-- Identidade proposta para reimportação; sem unicidade até homologação do OTO.
CREATE INDEX "coleta_diaria_empreendimento_id_periodo_id_fonte_data_estad_idx"
  ON "coleta_diaria"("empreendimento_id", "periodo_id", "fonte", "data_estadia", "tipo_dia");

CREATE INDEX "rhc_periodo_conferido_por_usuario_id_idx"
  ON "rhc_periodo"("conferido_por_usuario_id");

ALTER TABLE "coleta_diaria"
  ADD CONSTRAINT "coleta_diaria_conferido_por_usuario_id_fkey"
  FOREIGN KEY ("conferido_por_usuario_id") REFERENCES "usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rhc_periodo"
  ADD CONSTRAINT "rhc_periodo_conferido_por_usuario_id_fkey"
  FOREIGN KEY ("conferido_por_usuario_id") REFERENCES "usuario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
