import { Button } from '@/components/ui/button';

export function Paginacao({
  label,
  page,
  totalPages,
  onChange,
}: {
  label: string;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label={label} className="flex items-center gap-3">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </Button>
      <span>Página {page}</span>
      <Button
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
