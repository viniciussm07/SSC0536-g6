-- AlterTable
ALTER TABLE "pesquisa_modelo" ADD COLUMN     "criada_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "versao_atual" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "pesquisa_modelo_versao" (
    "modelo_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "publico_alvo" TEXT NOT NULL,
    "criada_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criada_por" INTEGER,
    "motivo" TEXT,

    CONSTRAINT "pesquisa_modelo_versao_pkey" PRIMARY KEY ("modelo_id","numero")
);

-- CreateTable
CREATE TABLE "pesquisa_campo_versao" (
    "modelo_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "campo_id" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo_valor" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL,
    "ordem" INTEGER NOT NULL,
    "opcoes" JSONB,

    CONSTRAINT "pesquisa_campo_versao_pkey" PRIMARY KEY ("modelo_id","numero","campo_id")
);

-- CreateTable
CREATE TABLE "pesquisa_campo_opcao" (
    "id" SERIAL NOT NULL,
    "campo_id" INTEGER NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "pesquisa_campo_opcao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pesquisa_campo_opcao_campo_id_chave_key" ON "pesquisa_campo_opcao"("campo_id", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "periodo_tipo_data_inicio_data_fim_key" ON "periodo"("tipo", "data_inicio", "data_fim");

-- AddForeignKey
ALTER TABLE "pesquisa_modelo_versao" ADD CONSTRAINT "pesquisa_modelo_versao_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "pesquisa_modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_campo_versao" ADD CONSTRAINT "pesquisa_campo_versao_modelo_id_numero_fkey" FOREIGN KEY ("modelo_id", "numero") REFERENCES "pesquisa_modelo_versao"("modelo_id", "numero") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_campo_opcao" ADD CONSTRAINT "pesquisa_campo_opcao_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "pesquisa_campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

