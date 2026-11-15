-- O modelo User do setup só pode ser removido quando estiver vazio.
-- Dados existentes exigem uma migração explícita para usuario (IDs e perfis diferentes).
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" LIMIT 1) THEN
    RAISE EXCEPTION 'A tabela User contém dados. Migre esses usuários explicitamente antes de aplicar oto_domain.';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS postgis;

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "segmento" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nivel_cadastro" TEXT NOT NULL,

    CONSTRAINT "segmento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreendimento" (
    "id" SERIAL NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "razao_social" TEXT,
    "cnpj" TEXT,
    "id_origem" TEXT,
    "tipo_hospedagem" TEXT,
    "categoria_indicador" TEXT,
    "endereco" TEXT,
    "zona" TEXT,
    "localizacao" geography,
    "data_inicio_atividades" DATE,
    "situacao" TEXT NOT NULL,
    "data_encerramento" DATE,

    CONSTRAINT "empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreendimento_segmento" (
    "empreendimento_id" INTEGER NOT NULL,
    "segmento_id" INTEGER NOT NULL,

    CONSTRAINT "empreendimento_segmento_pkey" PRIMARY KEY ("empreendimento_id","segmento_id")
);

-- CreateTable
CREATE TABLE "contato" (
    "id" SERIAL NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "responsavel_nome" TEXT,
    "responsavel_cargo" TEXT,

    CONSTRAINT "contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadastur" (
    "id" SERIAL NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "situacao" TEXT NOT NULL,
    "numero" TEXT,
    "vencimento" DATE,

    CONSTRAINT "cadastur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_empreendimento" (
    "usuario_id" INTEGER NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_empreendimento_pkey" PRIMARY KEY ("usuario_id","empreendimento_id")
);

-- CreateTable
CREATE TABLE "catalogo_grupo" (
    "id" SERIAL NOT NULL,
    "segmento_id" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "selecao" TEXT NOT NULL,
    "permite_outro" BOOLEAN NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "catalogo_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_item" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "exclusivo" BOOLEAN NOT NULL,
    "ordem" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_versao" (
    "id" SERIAL NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "criada_por" INTEGER NOT NULL,
    "vigencia_inicio" DATE NOT NULL,
    "vigencia_fim" DATE,
    "tipo_alteracao" TEXT NOT NULL,
    "situacao_conferencia" TEXT NOT NULL,
    "total_uh" INTEGER,
    "leitos" INTEGER,
    "max_leitos_por_uh" INTEGER,
    "uhs_pcd" INTEGER,
    "func_fixos" INTEGER,
    "func_temporarios" INTEGER,
    "checkin" TIME(6),
    "checkout" TIME(6),
    "funciona_24h" BOOLEAN,

    CONSTRAINT "inventario_versao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_item" (
    "versao_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "detalhe" TEXT,
    "quantidade" INTEGER,

    CONSTRAINT "inventario_item_pkey" PRIMARY KEY ("versao_id","item_id")
);

-- CreateTable
CREATE TABLE "pesquisa_modelo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "publico_alvo" TEXT NOT NULL,

    CONSTRAINT "pesquisa_modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesquisa" (
    "id" SERIAL NOT NULL,
    "modelo_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo_coleta" TEXT NOT NULL,
    "abertura" TIMESTAMP(6) NOT NULL,
    "prazo" TIMESTAMP(6) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "pesquisa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesquisa_campo" (
    "id" SERIAL NOT NULL,
    "modelo_id" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo_valor" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "pesquisa_campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesquisa_pergunta" (
    "id" SERIAL NOT NULL,
    "pesquisa_id" INTEGER NOT NULL,
    "campo_id" INTEGER NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "rotulo" TEXT NOT NULL,

    CONSTRAINT "pesquisa_pergunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta" (
    "id" SERIAL NOT NULL,
    "pesquisa_id" INTEGER NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "respondida_em" TIMESTAMP(6) NOT NULL,
    "canal" TEXT NOT NULL,

    CONSTRAINT "resposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta_item" (
    "resposta_id" INTEGER NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "valor_numerico" DECIMAL,
    "valor_texto" TEXT,

    CONSTRAINT "resposta_item_pkey" PRIMARY KEY ("resposta_id","pergunta_id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "antes" JSONB,
    "depois" JSONB,
    "em" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodo" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,

    CONSTRAINT "periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coleta_diaria" (
    "id" SERIAL NOT NULL,
    "empreendimento_id" INTEGER NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "fonte" TEXT NOT NULL,
    "data_coleta" DATE NOT NULL,
    "data_estadia" DATE NOT NULL,
    "tipo_dia" TEXT NOT NULL,
    "valor_diaria" DECIMAL NOT NULL,

    CONSTRAINT "coleta_diaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicador_definicao" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "formula_descricao" TEXT NOT NULL,
    "versao_formula" INTEGER NOT NULL,

    CONSTRAINT "indicador_definicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicador_resultado" (
    "id" SERIAL NOT NULL,
    "definicao_id" INTEGER NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "tipo_coleta" TEXT NOT NULL,
    "recorte" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "calculado_em" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "indicador_resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicador_resultado_versao" (
    "resultado_id" INTEGER NOT NULL,
    "versao_id" INTEGER NOT NULL,

    CONSTRAINT "indicador_resultado_versao_pkey" PRIMARY KEY ("resultado_id","versao_id")
);

-- CreateTable
CREATE TABLE "parametro_calculo" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "vigencia_inicio" DATE NOT NULL,
    "vigencia_fim" DATE,
    "fonte" TEXT,

    CONSTRAINT "parametro_calculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicador_resultado_parametro" (
    "resultado_id" INTEGER NOT NULL,
    "parametro_id" INTEGER NOT NULL,

    CONSTRAINT "indicador_resultado_parametro_pkey" PRIMARY KEY ("resultado_id","parametro_id")
);

-- CreateTable
CREATE TABLE "rhc_periodo" (
    "id" SERIAL NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "qtd_rhc" INTEGER NOT NULL,
    "leitos" INTEGER NOT NULL,

    CONSTRAINT "rhc_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "segmento_chave_key" ON "segmento"("chave");

-- CreateIndex
CREATE INDEX "empreendimento_segmento_segmento_id_idx" ON "empreendimento_segmento"("segmento_id");

-- CreateIndex
CREATE INDEX "contato_empreendimento_id_idx" ON "contato"("empreendimento_id");

-- CreateIndex
CREATE INDEX "cadastur_empreendimento_id_idx" ON "cadastur"("empreendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_empreendimento_empreendimento_id_idx" ON "usuario_empreendimento"("empreendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_grupo_chave_key" ON "catalogo_grupo"("chave");

-- CreateIndex
CREATE INDEX "catalogo_grupo_segmento_id_idx" ON "catalogo_grupo"("segmento_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_item_chave_key" ON "catalogo_item"("chave");

-- CreateIndex
CREATE INDEX "catalogo_item_grupo_id_idx" ON "catalogo_item"("grupo_id");

-- CreateIndex
CREATE INDEX "inventario_versao_empreendimento_id_vigencia_inicio_idx" ON "inventario_versao"("empreendimento_id", "vigencia_inicio");

-- CreateIndex
CREATE INDEX "inventario_versao_criada_por_idx" ON "inventario_versao"("criada_por");

-- CreateIndex
CREATE INDEX "inventario_item_item_id_idx" ON "inventario_item"("item_id");

-- CreateIndex
CREATE INDEX "pesquisa_modelo_id_idx" ON "pesquisa"("modelo_id");

-- CreateIndex
CREATE INDEX "pesquisa_campo_modelo_id_idx" ON "pesquisa_campo"("modelo_id");

-- CreateIndex
CREATE INDEX "pesquisa_pergunta_pesquisa_id_idx" ON "pesquisa_pergunta"("pesquisa_id");

-- CreateIndex
CREATE INDEX "pesquisa_pergunta_campo_id_idx" ON "pesquisa_pergunta"("campo_id");

-- CreateIndex
CREATE INDEX "pesquisa_pergunta_periodo_id_idx" ON "pesquisa_pergunta"("periodo_id");

-- CreateIndex
CREATE INDEX "resposta_empreendimento_id_idx" ON "resposta"("empreendimento_id");

-- CreateIndex
CREATE INDEX "resposta_usuario_id_idx" ON "resposta"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "resposta_pesquisa_id_empreendimento_id_key" ON "resposta"("pesquisa_id", "empreendimento_id");

-- CreateIndex
CREATE INDEX "resposta_item_pergunta_id_idx" ON "resposta_item"("pergunta_id");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "coleta_diaria_empreendimento_id_periodo_id_idx" ON "coleta_diaria"("empreendimento_id", "periodo_id");

-- CreateIndex
CREATE INDEX "coleta_diaria_periodo_id_idx" ON "coleta_diaria"("periodo_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicador_definicao_codigo_key" ON "indicador_definicao"("codigo");

-- CreateIndex
CREATE INDEX "indicador_resultado_definicao_id_periodo_id_idx" ON "indicador_resultado"("definicao_id", "periodo_id");

-- CreateIndex
CREATE INDEX "indicador_resultado_periodo_id_idx" ON "indicador_resultado"("periodo_id");

-- CreateIndex
CREATE INDEX "indicador_resultado_versao_versao_id_idx" ON "indicador_resultado_versao"("versao_id");

-- CreateIndex
CREATE INDEX "indicador_resultado_parametro_parametro_id_idx" ON "indicador_resultado_parametro"("parametro_id");

-- CreateIndex
CREATE INDEX "rhc_periodo_periodo_id_idx" ON "rhc_periodo"("periodo_id");

-- AddForeignKey
ALTER TABLE "empreendimento_segmento" ADD CONSTRAINT "empreendimento_segmento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimento_segmento" ADD CONSTRAINT "empreendimento_segmento_segmento_id_fkey" FOREIGN KEY ("segmento_id") REFERENCES "segmento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contato" ADD CONSTRAINT "contato_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cadastur" ADD CONSTRAINT "cadastur_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_empreendimento" ADD CONSTRAINT "usuario_empreendimento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_empreendimento" ADD CONSTRAINT "usuario_empreendimento_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_grupo" ADD CONSTRAINT "catalogo_grupo_segmento_id_fkey" FOREIGN KEY ("segmento_id") REFERENCES "segmento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_item" ADD CONSTRAINT "catalogo_item_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "catalogo_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_versao" ADD CONSTRAINT "inventario_versao_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_versao" ADD CONSTRAINT "inventario_versao_criada_por_fkey" FOREIGN KEY ("criada_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_item" ADD CONSTRAINT "inventario_item_versao_id_fkey" FOREIGN KEY ("versao_id") REFERENCES "inventario_versao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_item" ADD CONSTRAINT "inventario_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalogo_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa" ADD CONSTRAINT "pesquisa_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "pesquisa_modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_campo" ADD CONSTRAINT "pesquisa_campo_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "pesquisa_modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_pergunta" ADD CONSTRAINT "pesquisa_pergunta_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_pergunta" ADD CONSTRAINT "pesquisa_pergunta_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "pesquisa_campo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_pergunta" ADD CONSTRAINT "pesquisa_pergunta_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta" ADD CONSTRAINT "resposta_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta" ADD CONSTRAINT "resposta_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta" ADD CONSTRAINT "resposta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_item" ADD CONSTRAINT "resposta_item_resposta_id_fkey" FOREIGN KEY ("resposta_id") REFERENCES "resposta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_item" ADD CONSTRAINT "resposta_item_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "pesquisa_pergunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coleta_diaria" ADD CONSTRAINT "coleta_diaria_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coleta_diaria" ADD CONSTRAINT "coleta_diaria_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_resultado" ADD CONSTRAINT "indicador_resultado_definicao_id_fkey" FOREIGN KEY ("definicao_id") REFERENCES "indicador_definicao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_resultado" ADD CONSTRAINT "indicador_resultado_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_resultado_versao" ADD CONSTRAINT "indicador_resultado_versao_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "indicador_resultado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_resultado_versao" ADD CONSTRAINT "indicador_resultado_versao_versao_id_fkey" FOREIGN KEY ("versao_id") REFERENCES "inventario_versao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_resultado_parametro" ADD CONSTRAINT "indicador_resultado_parametro_resultado_id_fkey" FOREIGN KEY ("resultado_id") REFERENCES "indicador_resultado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicador_resultado_parametro" ADD CONSTRAINT "indicador_resultado_parametro_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametro_calculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rhc_periodo" ADD CONSTRAINT "rhc_periodo_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
