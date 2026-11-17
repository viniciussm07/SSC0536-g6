-- Parte 13: resposta do empresário pela plataforma.
-- Correção substitui os itens enquanto a edição recebe respostas; a auditoria guarda antes/depois.
ALTER TABLE "resposta" ADD COLUMN "atualizada_em" TIMESTAMP(6);

-- Restrições novas valem para gravações futuras; linhas legadas não são reinterpretadas.
ALTER TABLE "resposta"
  ADD CONSTRAINT "resposta_atualizada_em_check"
  CHECK ("atualizada_em" IS NULL OR "atualizada_em" >= "respondida_em") NOT VALID;
ALTER TABLE "resposta_item"
  ADD CONSTRAINT "resposta_item_um_valor_check"
  CHECK (num_nonnulls("valor_numerico", "valor_texto") = 1) NOT VALID;
