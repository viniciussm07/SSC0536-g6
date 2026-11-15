import {
  ESQUEMA_CATALOGO_VERSOES,
  type ItemCatalogoLinha,
} from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { catalogoService } from '@/services/catalogo';
import { colunasVersoes } from '../../colunas';

/** Histórico imutável do item: cada versão guarda rótulo, pergunta e regras daquele momento. */
export function HistoricoItem({ item }: { item: ItemCatalogoLinha }) {
  const acesso = useAcessoAtual();
  return (
    <GradeColecao
      id="versoes"
      rotulo="Versões do item"
      esquema={ESQUEMA_CATALOGO_VERSOES}
      colunas={colunasVersoes}
      getRowId={(v) => String(v.numero)}
      chave={[
        'catalogos',
        'versoes',
        acesso.usuarioId,
        acesso.revisao,
        item.id,
      ]}
      buscar={(consulta, signal) =>
        catalogoService.versoes(item.id, consulta, signal)
      }
      mensagemVazia="Nenhuma versão encontrada."
    />
  );
}
