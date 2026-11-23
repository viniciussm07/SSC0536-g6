-- Expectativa: as duas tabulações compartilham as correspondências "nome informado -> empreendimento".
-- Registros existentes da Consolidado passam ao grupo comum; nenhuma decisão é perdida.
UPDATE "importacao_correspondencia" SET "fonte" = 'tabulacao' WHERE "fonte" = 'tabulacao_consolidado';
