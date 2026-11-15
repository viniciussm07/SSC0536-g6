import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { AcoesLinha } from '.';

describe('AcoesLinha', () => {
  it('abre um menu com ícone e nome de cada ação, respeita desabilitadas e dispara a escolhida', async () => {
    const editar = vi.fn();
    const remover = vi.fn();
    const user = userEvent.setup();
    render(
      <AcoesLinha
        rotulo="Hotel A"
        acoes={[
          { rotulo: 'Editar', icone: Pencil, onSelecionar: editar },
          {
            rotulo: 'Remover',
            icone: Trash2,
            onSelecionar: remover,
            desabilitada: true,
            destrutiva: true,
          },
        ]}
      />,
    );
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ações de Hotel A' }));
    const editarItem = await screen.findByRole('menuitem', { name: 'Editar' });
    expect(editarItem.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.click(screen.getByRole('menuitem', { name: 'Remover' }));
    expect(remover).not.toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(editar).toHaveBeenCalledTimes(1);
  });
});
