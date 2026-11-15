import { useGradeNaUrl } from '@/hooks/use-grade-na-url';
import type { ConsultaColecao } from '@/services/odata';
import { consultaDaGrade } from '@/utils/grade';

/** Consulta atual de uma grade (lida da URL); útil para ações como exportação. */
export function useConsultaDaGrade(id: string): ConsultaColecao {
  const { filter, orderby, page } = useGradeNaUrl(id);
  return consultaDaGrade({ filter, orderby, page });
}
