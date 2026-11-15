import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBlocker } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ProtecaoContext,
  type FormularioProtegido,
  type ProtecaoAlteracoes,
} from './context';

export function ProtecaoAlteracoesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const formularios = useRef(new Map<symbol, FormularioProtegido>());
  const pendente = useRef<((descartar: boolean) => void) | null>(null);
  const [emEnvio, setEmEnvio] = useState(false);
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const alterado = useCallback(
    () => [...formularios.current.values()].some((f) => f.alterado()),
    [],
  );
  const confirmar = useCallback(async () => {
    if ([...formularios.current.values()].some((f) => f.enviando())) {
      setSalvando(true);
      return false;
    }
    if (!alterado()) return true;
    if (pendente.current) return false;
    return new Promise<boolean>((resolve) => {
      pendente.current = resolve;
      setAberto(true);
    });
  }, [alterado]);
  const responder = (descartar: boolean) => {
    const resolver = pendente.current;
    pendente.current = null;
    setAberto(false);
    resolver?.(descartar);
  };
  useEffect(
    () => () => {
      pendente.current?.(false);
      pendente.current = null;
    },
    [],
  );
  useBlocker({
    shouldBlockFn: async ({ next }) =>
      next.pathname === '/entrar' ? false : !(await confirmar()),
    enableBeforeUnload: false,
  });
  useEffect(() => {
    if (!temAlteracoes) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      if (alterado()) {
        evento.preventDefault();
        evento.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [temAlteracoes, alterado]);
  const valor = useMemo<ProtecaoAlteracoes>(
    () => ({
      registrar: (id, formulario) => {
        formularios.current.set(id, formulario);
        const atualizar = () => {
          setTemAlteracoes(alterado());
          setEmEnvio(
            [...formularios.current.values()].some((f) => f.enviando()),
          );
        };
        const remover = formulario.assinar(atualizar);
        atualizar();
        return () => {
          remover();
          formularios.current.delete(id);
          if (!formularios.current.size) {
            const resolver = pendente.current;
            pendente.current = null;
            resolver?.(false);
            setAberto(false);
          }
          atualizar();
        };
      },
      executar: async (acao) => {
        if (!(await confirmar())) return false;
        await acao();
        return true;
      },
    }),
    [confirmar, alterado],
  );
  return (
    <ProtecaoContext.Provider value={valor}>
      {children}
      {salvando && emEnvio && (
        <p
          role="status"
          className="fixed bottom-4 right-4 z-50 rounded-lg border bg-background p-4 shadow-lg"
        >
          Salvando alterações… Aguarde para continuar.
          <Button
            className="ml-2"
            variant="ghost"
            onClick={() => setSalvando(false)}
          >
            Fechar
          </Button>
        </p>
      )}
      <Dialog
        open={aberto}
        onOpenChange={(a) => {
          if (!a) responder(false);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Descartar alterações?</DialogTitle>
            <DialogDescription>
              Você tem alterações não salvas. Se continuar, elas serão
              descartadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => responder(false)}>
              Continuar editando
            </Button>
            <Button variant="destructive" onClick={() => responder(true)}>
              Descartar e continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtecaoContext.Provider>
  );
}
