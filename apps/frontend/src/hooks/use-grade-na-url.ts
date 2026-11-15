import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  buscaComEstadoDaGrade,
  estadoDaGrade,
  type BuscaGrade,
  type EstadoGrade,
} from '@/utils/grade';

/** Estado controlado de uma grade, persistido em search params namespaced. */
export function useGradeNaUrl(id: string) {
  const busca = useSearch({ strict: false }) as BuscaGrade;
  const navegar = useNavigate();
  const estado = estadoDaGrade(busca, id);
  const atualizar = (mudanca: Partial<EstadoGrade>, reiniciar = false) =>
    navegar({
      to: '.',
      replace: true,
      search: (anterior) =>
        buscaComEstadoDaGrade(anterior as BuscaGrade, id, {
          ...mudanca,
          ...(reiniciar ? { page: 1 } : {}),
        }),
    });
  return {
    ...estado,
    setFilter: (filter: string) => atualizar({ filter }, true),
    setOrderby: (orderby: string) => atualizar({ orderby }, true),
    setPage: (page: number) => atualizar({ page: Math.max(1, page) }),
  };
}
