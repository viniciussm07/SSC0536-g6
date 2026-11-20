-- Parte 12: publicação, prazo e acompanhamento das pesquisas.

-- 1) Snapshot da v1 dos modelos que existiam antes da parte 11 (sem histórico registrado).
INSERT INTO "pesquisa_modelo_versao" ("modelo_id", "numero", "nome", "publico_alvo", "criada_em", "criada_por", "motivo")
SELECT m."id", m."versao_atual", m."nome", m."publico_alvo", m."criada_em", NULL,
       'Versão registrada na migração da parte 12'
FROM "pesquisa_modelo" m
WHERE NOT EXISTS (
  SELECT 1 FROM "pesquisa_modelo_versao" v WHERE v."modelo_id" = m."id" AND v."numero" = m."versao_atual"
);

INSERT INTO "pesquisa_campo_versao" ("modelo_id", "numero", "campo_id", "chave", "rotulo", "tipo_valor", "obrigatorio", "ordem", "opcoes")
SELECT m."id", m."versao_atual", c."id", c."chave", c."rotulo", c."tipo_valor", c."obrigatorio", c."ordem",
       (SELECT jsonb_agg(jsonb_build_object('chave', o."chave", 'rotulo', o."rotulo", 'ordem', o."ordem") ORDER BY o."ordem")
          FROM "pesquisa_campo_opcao" o WHERE o."campo_id" = c."id")
FROM "pesquisa_campo" c
JOIN "pesquisa_modelo" m ON m."id" = c."modelo_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "pesquisa_campo_versao" cv WHERE cv."modelo_id" = m."id" AND cv."numero" = m."versao_atual"
);

-- 2) Edição vinculada à versão do modelo e ciclo rascunho → aberta → encerrada.
ALTER TABLE "pesquisa"
  ADD COLUMN "modelo_versao" INTEGER,
  ADD COLUMN "segmento_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "criada_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "aberta_em" TIMESTAMP(6),
  ADD COLUMN "encerrada_em" TIMESTAMP(6),
  ADD COLUMN "destinatarios_registrados_em" TIMESTAMP(6);

UPDATE "pesquisa" p SET "modelo_versao" = m."versao_atual"
FROM "pesquisa_modelo" m WHERE m."id" = p."modelo_id";

-- Edições legadas: abertura conhecida; encerramento registrado no prazo, sem inventar autoria.
UPDATE "pesquisa" SET "aberta_em" = "abertura" WHERE "status" IN ('aberta', 'encerrada');
UPDATE "pesquisa" SET "encerrada_em" = "prazo" WHERE "status" = 'encerrada';

ALTER TABLE "pesquisa" ALTER COLUMN "modelo_versao" SET NOT NULL;

ALTER TABLE "pesquisa"
  ADD CONSTRAINT "pesquisa_status_check" CHECK ("status" IN ('rascunho', 'aberta', 'encerrada')),
  ADD CONSTRAINT "pesquisa_tipo_coleta_check" CHECK ("tipo_coleta" IN ('expectativa', 'consolidado')),
  ADD CONSTRAINT "pesquisa_prazo_check" CHECK ("prazo" > "abertura"),
  ADD CONSTRAINT "pesquisa_ciclo_check" CHECK (
    ("status" = 'rascunho' AND "aberta_em" IS NULL AND "encerrada_em" IS NULL)
    OR ("status" = 'aberta' AND "aberta_em" IS NOT NULL AND "encerrada_em" IS NULL)
    OR ("status" = 'encerrada' AND "encerrada_em" IS NOT NULL)
  );

CREATE INDEX "pesquisa_modelo_id_modelo_versao_idx" ON "pesquisa"("modelo_id", "modelo_versao");

ALTER TABLE "pesquisa" ADD CONSTRAINT "pesquisa_modelo_id_modelo_versao_fkey"
  FOREIGN KEY ("modelo_id", "modelo_versao") REFERENCES "pesquisa_modelo_versao"("modelo_id", "numero")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Público congelado na abertura.
CREATE TABLE "pesquisa_destinatario" (
    "pesquisa_id" INTEGER NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "incluido_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesquisa_destinatario_pkey" PRIMARY KEY ("pesquisa_id","empreendimento_id")
);
CREATE INDEX "pesquisa_destinatario_empreendimento_id_idx" ON "pesquisa_destinatario"("empreendimento_id");
ALTER TABLE "pesquisa_destinatario" ADD CONSTRAINT "pesquisa_destinatario_pesquisa_id_fkey"
  FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pesquisa_destinatario" ADD CONSTRAINT "pesquisa_destinatario_empreendimento_id_fkey"
  FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) Caixa de saída para notificações (parte 14): gravada na mesma transação da abertura.
CREATE TABLE "pesquisa_evento" (
    "id" SERIAL NOT NULL,
    "pesquisa_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processado_em" TIMESTAMP(6),

    CONSTRAINT "pesquisa_evento_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pesquisa_evento_tipo_check" CHECK ("tipo" IN ('aberta'))
);
CREATE UNIQUE INDEX "pesquisa_evento_pesquisa_id_tipo_key" ON "pesquisa_evento"("pesquisa_id", "tipo");
CREATE INDEX "pesquisa_evento_processado_em_idx" ON "pesquisa_evento"("processado_em");
ALTER TABLE "pesquisa_evento" ADD CONSTRAINT "pesquisa_evento_pesquisa_id_fkey"
  FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
