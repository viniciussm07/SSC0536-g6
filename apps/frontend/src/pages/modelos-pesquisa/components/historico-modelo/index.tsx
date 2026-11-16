import {
  COLECOES,
  ESQUEMA_VERSOES_MODELO,
  type ModeloPesquisaLinha,
} from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { modelosPesquisaService } from '@/services/pesquisas';
import { colunasVersoes } from '../../colunas';

/** Histórico imutável do modelo: cada versão guarda nome, público-alvo e o motivo da troca. */
export function HistoricoModelo({ modelo }: { modelo: ModeloPesquisaLinha }) {
  const acesso = useAcessoAtual();
  return (
    <GradeColecao
      id="versoes"
      parametros={{ id: modelo.id }}
      rotulo="Versões do modelo"
      esquema={ESQUEMA_VERSOES_MODELO}
      colunas={colunasVersoes}
      getRowId={(v) => String(v.numero)}
      chave={[
        'modelos',
        'versoes',
        acesso.usuarioId,
        acesso.revisao,
        modelo.id,
      ]}
      colecao={COLECOES.versoesModelo}
      buscar={(consulta, signal) =>
        modelosPesquisaService.versoes(modelo.id, consulta, signal)
      }
      mensagemVazia="Nenhuma versão encontrada."
    />
  );
}
