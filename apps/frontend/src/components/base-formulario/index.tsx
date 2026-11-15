import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';

/** Snapshot da fonte; refetch nunca remonta nem substitui campos preenchidos. */
export function BaseFormulario<T>({
  dados,
  children,
}: {
  dados: T;
  children: (base: T) => ReactNode;
}) {
  const [base, setBase] = useState(() => ({ dados, revisao: 0 }));
  const protecao = useProtecaoAlteracoes();
  const atualizado = JSON.stringify(dados) !== JSON.stringify(base.dados);
  const recarregar = () =>
    setBase((anterior) => ({ dados, revisao: anterior.revisao + 1 }));
  return (
    <>
      {atualizado && (
        <div role="status" className="space-y-2 rounded-lg border bg-muted p-3">
          <p>
            Há dados atualizados disponíveis. Seu preenchimento foi mantido.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if (protecao) void protecao.executar(recarregar);
              else recarregar();
            }}
          >
            Recarregar dados
          </Button>
        </div>
      )}
      <div key={base.revisao}>{children(base.dados)}</div>
    </>
  );
}
