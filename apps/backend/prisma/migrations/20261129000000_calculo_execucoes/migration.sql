-- Parte 16: execuções do cálculo de indicadores, revisões, publicação e linhagem.
-- Insumos congelados por execução; resultados gravados de uma vez e preservados após substituição.

-- AlterTable
ALTER TABLE "indicador_resultado" ADD COLUMN     "detalhe_indisponibilidade" TEXT,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'disponivel',
ADD COLUMN     "execucao_id" INTEGER,
ADD COLUMN     "motivo_indisponibilidade" TEXT,
ALTER COLUMN "valor" DROP NOT NULL;

-- CreateTable
CREATE TABLE "calculo_execucao" (
    "id" SERIAL NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "tipo_coleta" TEXT NOT NULL,
    "pesquisa_id" INTEGER NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "versao_formula" INTEGER NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'pendente',
    "revisao" INTEGER,
    "publicacao" TEXT NOT NULL DEFAULT 'calculado',
    "insumos" JSONB NOT NULL,
    "insumos_hash" TEXT NOT NULL,
    "motivo" TEXT,
    "erro" TEXT,
    "solicitada_por_id" INTEGER NOT NULL,
    "solicitada_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciada_em" TIMESTAMP(6),
    "concluida_em" TIMESTAMP(6),
    "publicada_por_id" INTEGER,
    "publicada_em" TIMESTAMP(6),
    "motivo_publicacao" TEXT,
    "substituida_por_id" INTEGER,

    CONSTRAINT "calculo_execucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculo_execucao_resposta" (
    "execucao_id" INTEGER NOT NULL,
    "resposta_id" INTEGER NOT NULL,

    CONSTRAINT "calculo_execucao_resposta_pkey" PRIMARY KEY ("execucao_id","resposta_id")
);

-- CreateIndex
CREATE INDEX "calculo_execucao_periodo_id_idx" ON "calculo_execucao"("periodo_id");

-- CreateIndex
CREATE INDEX "calculo_execucao_pesquisa_id_idx" ON "calculo_execucao"("pesquisa_id");

-- CreateIndex
CREATE INDEX "calculo_execucao_solicitada_por_id_idx" ON "calculo_execucao"("solicitada_por_id");

-- CreateIndex
CREATE INDEX "calculo_execucao_publicada_por_id_idx" ON "calculo_execucao"("publicada_por_id");

-- CreateIndex
CREATE INDEX "calculo_execucao_substituida_por_id_idx" ON "calculo_execucao"("substituida_por_id");

-- CreateIndex
CREATE UNIQUE INDEX "calculo_execucao_pergunta_id_revisao_key" ON "calculo_execucao"("pergunta_id", "revisao");

-- CreateIndex
CREATE INDEX "calculo_execucao_resposta_resposta_id_idx" ON "calculo_execucao_resposta"("resposta_id");

-- CreateIndex
CREATE INDEX "indicador_resultado_execucao_id_idx" ON "indicador_resultado"("execucao_id");

-- AddForeignKey
ALTER TABLE "indicador_resultado" ADD CONSTRAINT "indicador_resultado_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "calculo_execucao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao" ADD CONSTRAINT "calculo_execucao_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao" ADD CONSTRAINT "calculo_execucao_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao" ADD CONSTRAINT "calculo_execucao_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pesquisa_pergunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao" ADD CONSTRAINT "calculo_execucao_solicitada_por_id_fkey" FOREIGN KEY ("solicitada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao" ADD CONSTRAINT "calculo_execucao_publicada_por_id_fkey" FOREIGN KEY ("publicada_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao" ADD CONSTRAINT "calculo_execucao_substituida_por_id_fkey" FOREIGN KEY ("substituida_por_id") REFERENCES "calculo_execucao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao_resposta" ADD CONSTRAINT "calculo_execucao_resposta_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "calculo_execucao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_execucao_resposta" ADD CONSTRAINT "calculo_execucao_resposta_resposta_id_fkey" FOREIGN KEY ("resposta_id") REFERENCES "resposta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Resultado indisponível guarda motivo e detalhe, nunca zero.
ALTER TABLE "indicador_resultado"
  ADD CONSTRAINT "indicador_resultado_estado_check" CHECK (
    ("estado" = 'disponivel' AND "valor" IS NOT NULL
      AND "motivo_indisponibilidade" IS NULL AND "detalhe_indisponibilidade" IS NULL)
    OR ("estado" = 'indisponivel' AND "valor" IS NULL
      AND "motivo_indisponibilidade" IN ('sem_respondentes', 'capacidade_zero', 'base_zero',
        'dado_ausente', 'parametro_ausente', 'entrada_invalida')
      AND "detalhe_indisponibilidade" IS NOT NULL)
  );

ALTER TABLE "calculo_execucao"
  ADD CONSTRAINT "calculo_execucao_situacao_check"
    CHECK ("situacao" IN ('pendente', 'executando', 'concluido', 'falhou')),
  ADD CONSTRAINT "calculo_execucao_publicacao_check"
    CHECK ("publicacao" IN ('calculado', 'publicado', 'substituido')),
  ADD CONSTRAINT "calculo_execucao_tipo_coleta_check"
    CHECK ("tipo_coleta" IN ('expectativa', 'consolidado')),
  ADD CONSTRAINT "calculo_execucao_versao_check" CHECK ("versao_formula" >= 1),
  ADD CONSTRAINT "calculo_execucao_insumos_check" CHECK (
    jsonb_typeof("insumos") = 'object' AND "insumos_hash" ~ '^[0-9a-f]{64}$'),
  -- Concluída tem revisão e instante; só concluída é publicada; falha sempre explica o erro.
  ADD CONSTRAINT "calculo_execucao_conclusao_check" CHECK (
    ("situacao" = 'concluido') = ("revisao" IS NOT NULL AND "concluida_em" IS NOT NULL)
    AND ("revisao" IS NULL OR "revisao" >= 1)
    AND ("situacao" <> 'falhou' OR "erro" IS NOT NULL)
    AND ("situacao" = 'concluido' OR "publicacao" = 'calculado')),
  ADD CONSTRAINT "calculo_execucao_publicacao_dados_check" CHECK (
    ("publicacao" = 'calculado') = ("publicada_em" IS NULL AND "publicada_por_id" IS NULL)
    AND ("publicacao" = 'substituido') = ("substituida_por_id" IS NOT NULL)
    AND ("substituida_por_id" IS NULL OR "substituida_por_id" <> "id"));

-- Uma execução ativa e uma publicação por pergunta (série). O serviço também serializa por lock.
CREATE UNIQUE INDEX "calculo_execucao_ativa_key" ON "calculo_execucao" ("pergunta_id")
  WHERE "situacao" IN ('pendente', 'executando');
CREATE UNIQUE INDEX "calculo_execucao_publicada_key" ON "calculo_execucao" ("pergunta_id")
  WHERE "publicacao" = 'publicado';

-- Insumos, revisão e publicação não são reescritos; só as transições do ciclo são aceitas.
CREATE FUNCTION proteger_calculo_execucao() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'calculo_execucao é preservada; não exclua execuções';
  END IF;
  IF OLD.periodo_id IS DISTINCT FROM NEW.periodo_id
    OR OLD.tipo_coleta IS DISTINCT FROM NEW.tipo_coleta
    OR OLD.pesquisa_id IS DISTINCT FROM NEW.pesquisa_id
    OR OLD.pergunta_id IS DISTINCT FROM NEW.pergunta_id
    OR OLD.versao_formula IS DISTINCT FROM NEW.versao_formula
    OR OLD.insumos IS DISTINCT FROM NEW.insumos
    OR OLD.insumos_hash IS DISTINCT FROM NEW.insumos_hash
    OR OLD.motivo IS DISTINCT FROM NEW.motivo
    OR OLD.solicitada_por_id IS DISTINCT FROM NEW.solicitada_por_id
    OR OLD.solicitada_em IS DISTINCT FROM NEW.solicitada_em
    OR (OLD.revisao IS NOT NULL AND OLD.revisao IS DISTINCT FROM NEW.revisao)
    OR (OLD.concluida_em IS NOT NULL AND OLD.concluida_em IS DISTINCT FROM NEW.concluida_em)
    OR (OLD.publicada_em IS NOT NULL AND (OLD.publicada_em IS DISTINCT FROM NEW.publicada_em
      OR OLD.publicada_por_id IS DISTINCT FROM NEW.publicada_por_id
      OR OLD.motivo_publicacao IS DISTINCT FROM NEW.motivo_publicacao))
    OR (OLD.substituida_por_id IS NOT NULL AND OLD.substituida_por_id IS DISTINCT FROM NEW.substituida_por_id)
  THEN
    RAISE EXCEPTION 'insumos, revisão e publicação de calculo_execucao são imutáveis';
  END IF;
  IF OLD.situacao IS DISTINCT FROM NEW.situacao AND NOT (
    (OLD.situacao = 'pendente' AND NEW.situacao IN ('executando', 'falhou'))
    OR (OLD.situacao = 'executando' AND NEW.situacao IN ('concluido', 'falhou'))
    OR (OLD.situacao = 'falhou' AND NEW.situacao = 'executando'))
  THEN
    RAISE EXCEPTION 'transição de situação inválida: % -> %', OLD.situacao, NEW.situacao;
  END IF;
  IF OLD.publicacao IS DISTINCT FROM NEW.publicacao AND NOT (
    (OLD.publicacao = 'calculado' AND NEW.publicacao = 'publicado')
    OR (OLD.publicacao = 'publicado' AND NEW.publicacao = 'substituido'))
  THEN
    RAISE EXCEPTION 'transição de publicação inválida: % -> %', OLD.publicacao, NEW.publicacao;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER calculo_execucao_protegida
  BEFORE UPDATE OR DELETE ON calculo_execucao
  FOR EACH ROW EXECUTE FUNCTION proteger_calculo_execucao();

-- Resultado de execução só nasce durante o processamento e nunca muda depois.
-- Resultados anteriores à parte 16 (execucao_id nulo) mantêm o comportamento antigo.
CREATE FUNCTION proteger_indicador_resultado() RETURNS trigger AS $$
DECLARE
  situacao_execucao TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.execucao_id IS NOT NULL THEN
      SELECT situacao INTO situacao_execucao FROM calculo_execucao WHERE id = NEW.execucao_id;
      IF situacao_execucao IS DISTINCT FROM 'executando' THEN
        RAISE EXCEPTION 'resultado só pode ser gravado por execução em andamento';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.execucao_id IS NOT NULL THEN
    RAISE EXCEPTION 'resultado de execução é imutável; recalcule para gerar nova revisão';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  IF NEW.execucao_id IS NOT NULL THEN
    RAISE EXCEPTION 'resultado de carga não pode ser associado a uma execução';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER indicador_resultado_protegido
  BEFORE INSERT OR UPDATE OR DELETE ON indicador_resultado
  FOR EACH ROW EXECUTE FUNCTION proteger_indicador_resultado();

-- A linhagem das respostas é fixada junto com os insumos.
CREATE FUNCTION proteger_calculo_execucao_resposta() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'linhagem de calculo_execucao_resposta é imutável';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER calculo_execucao_resposta_protegida
  BEFORE UPDATE OR DELETE ON calculo_execucao_resposta
  FOR EACH ROW EXECUTE FUNCTION proteger_calculo_execucao_resposta();
