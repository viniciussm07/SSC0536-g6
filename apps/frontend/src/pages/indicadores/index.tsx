import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { ESQUEMA_INDICADORES } from '@ssc0536/common';
import { GradeColecao } from '@/components/grade-colecao';
import { useAcessoAtual } from '@/hooks/use-acesso-atual';
import { acessoService } from '@/services/acesso';
import { permite } from '@/utils/acesso';
import { colunasIndicadores } from './colunas';

export function IndicadoresPage() {
  const acesso = useAcessoAtual();
  return (
    <section className="space-y-3" aria-label="Indicadores liberados">
      <CabecalhoPagina
        titulo="Indicadores liberados"
        descricao="Consulte os resultados disponíveis para seu perfil. Valores fictícios de demonstração não representam metodologia homologada."
      />
      <GradeColecao
        id="indicadores"
        rotulo="Indicadores"
        esquema={ESQUEMA_INDICADORES}
        colunas={colunasIndicadores}
        getRowId={(i) => String(i.id)}
        chave={['indicadores', acesso.usuarioId, acesso.revisao]}
        buscar={(c, signal) => acessoService.indicadores(c, signal)}
        habilitado={permite(acesso, 'indicadores', 'consultar')}
        mensagemVazia="Nenhum indicador encontrado para seu perfil e filtros."
      />
    </section>
  );
}
