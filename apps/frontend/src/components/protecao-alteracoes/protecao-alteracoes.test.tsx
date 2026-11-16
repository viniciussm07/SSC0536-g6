import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { useAppForm } from '@/hooks/use-app-form';
import {
  useProtecaoFormulario,
  useBaseFormulario,
} from '@/hooks/use-protecao-formulario';
import { useProtecaoAlteracoes } from '@/hooks/use-protecao-alteracoes';
import { BaseFormulario } from '@/components/base-formulario';
import { ProtecaoAlteracoesProvider } from '.';

function Formulario({
  nome,
  salvar,
}: {
  nome: string;
  salvar: () => Promise<void>;
}) {
  const [base, definirBase] = useBaseFormulario({ nome });
  const form = useAppForm({
    defaultValues: base,
    onSubmit: async ({ value, formApi }) => {
      try {
        await salvar();
        definirBase(value);
        formApi.reset(value);
      } catch {
        /* conserva os campos */
      }
    },
  });
  useProtecaoFormulario(form);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="nome">
        {(f) => <f.Input label="Nome" />}
      </form.AppField>
      <button type="submit">Salvar</button>
    </form>
  );
}
async function montar(salvar = vi.fn(async () => {})) {
  const alterarContexto = vi.fn();
  function Pagina() {
    const protecao = useProtecaoAlteracoes()!;
    const [nome, setNome] = useState('Hotel A');
    return (
      <>
        <BaseFormulario dados={{ nome }}>
          {(base) => <Formulario nome={base.nome} salvar={salvar} />}
        </BaseFormulario>
        <button
          onClick={() => {
            void protecao.executar(alterarContexto);
          }}
        >
          Trocar contexto
        </button>
        <button onClick={() => setNome('Hotel atualizado')}>
          Simular refetch
        </button>
        <Link to="/indicadores">Navegar</Link>
      </>
    );
  }
  const raiz = createRootRoute({
    component: () => (
      <ProtecaoAlteracoesProvider>
        <Outlet />
      </ProtecaoAlteracoesProvider>
    ),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: '/', component: Pagina }),
      createRoute({
        getParentRoute: () => raiz,
        path: '/indicadores',
        component: () => <p>Destino</p>,
      }),
    ]),
  });
  render(<RouterProvider router={router as never} />);
  await screen.findByLabelText('Nome');
  return { user: userEvent.setup(), router, alterarContexto };
}
describe('Proteção de alterações', () => {
  it('cancela e confirma navegação uma única vez, preservando o preenchimento', async () => {
    const { user } = await montar();
    await user.type(screen.getByLabelText('Nome'), ' editado');
    await user.click(screen.getByRole('link', { name: 'Navegar' }));
    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      'Descartar alterações?',
    );
    await user.click(
      screen.getByRole('button', { name: 'Continuar editando' }),
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Hotel A editado');
    await user.click(screen.getByRole('link', { name: 'Navegar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Descartar e continuar' }),
    );
    expect(await screen.findByText('Destino')).toBeInTheDocument();
  });
  it('reverter os valores remove o aviso e o bloqueio de fechamento da aba', async () => {
    const { user, alterarContexto } = await montar();
    const input = screen.getByLabelText('Nome');
    await user.type(input, 'x');
    const antes = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(antes);
    expect(antes.defaultPrevented).toBe(true);
    await user.clear(input);
    await user.type(input, 'Hotel A');
    const depois = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(depois);
    expect(depois.defaultPrevented).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Trocar contexto' }));
    expect(alterarContexto).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('protege ações locais, Escape cancela e confirmar executa uma vez', async () => {
    const { user, alterarContexto } = await montar();
    await user.type(screen.getByLabelText('Nome'), 'x');
    await user.click(screen.getByRole('button', { name: 'Trocar contexto' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(alterarContexto).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Trocar contexto' }));
    await user.click(
      await screen.findByRole('button', { name: 'Descartar e continuar' }),
    );
    expect(alterarContexto).toHaveBeenCalledTimes(1);
  });
  it('refetch mantém campos e só substitui a base após descarte explícito', async () => {
    const { user } = await montar();
    await user.type(screen.getByLabelText('Nome'), ' editado');
    await user.click(screen.getByRole('button', { name: 'Simular refetch' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Hotel A editado');
    await user.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    await user.click(
      await screen.findByRole('button', { name: 'Continuar editando' }),
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Hotel A editado');
    await user.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    await user.click(
      await screen.findByRole('button', { name: 'Descartar e continuar' }),
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Hotel atualizado');
  });
  it('falha mantém proteção, salvar bloqueia saída e sucesso estabelece nova base', async () => {
    let resolver!: () => void;
    const salvar = vi
      .fn()
      .mockRejectedValueOnce(new Error('falha'))
      .mockImplementationOnce(
        () =>
          new Promise<void>((r) => {
            resolver = r;
          }),
      );
    const { user, alterarContexto } = await montar(salvar);
    await user.type(screen.getByLabelText('Nome'), ' editado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(screen.getByRole('button', { name: 'Trocar contexto' }));
    await user.click(
      await screen.findByRole('button', { name: 'Continuar editando' }),
    );
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(screen.getByRole('button', { name: 'Trocar contexto' }));
    expect(screen.getByRole('status')).toHaveTextContent('Salvando alterações');
    expect(alterarContexto).not.toHaveBeenCalled();
    await act(async () => resolver());
    expect(screen.getByLabelText('Nome')).toHaveValue('Hotel A editado');
    await user.click(screen.getByRole('button', { name: 'Trocar contexto' }));
    await waitFor(() => expect(alterarContexto).toHaveBeenCalledTimes(1));
  });
});
