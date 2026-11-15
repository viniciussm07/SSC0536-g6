import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable } from './index';
import { criarColunas } from './recursos';

interface Linha {
  id: number;
  nome: string;
  total: number | null;
}
const coluna = criarColunas<Linha>();
const colunas = coluna.columns([
  coluna.accessor('nome', { header: 'Nome' }),
  coluna.accessor('total', {
    header: 'Total',
    cell: ({ cell }) => cell.getValue() ?? 'Não informado',
  }),
  coluna.display({
    id: 'acoes',
    header: 'Ações',
    cell: ({ row }) => <button>Abrir {row.original.nome}</button>,
  }),
]);
const idDaLinha = (l: Linha) => String(l.id);

describe('DataTable (TanStack Table)', () => {
  it('renderiza cabeçalhos, linhas e células a partir das definições de coluna', () => {
    render(
      <DataTable
        rotulo="Pessoas"
        colunas={colunas}
        dados={[
          { id: 1, nome: 'Ana', total: 3 },
          { id: 2, nome: 'Beto', total: null },
        ]}
        getRowId={idDaLinha}
        colunasADireita={['acoes']}
      />,
    );
    const tabela = screen.getByRole('table', { name: 'Pessoas' });
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Nome', 'Total', 'Ações']);
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas).toHaveLength(2);
    expect(within(linhas[0]).getByText('Ana')).toBeInTheDocument();
    expect(within(linhas[0]).getByText('3')).toBeInTheDocument();
    // null continua distinto de zero na apresentação.
    expect(within(linhas[1]).getByText('Não informado')).toBeInTheDocument();
    expect(
      within(linhas[1]).getByRole('button', { name: 'Abrir Beto' }),
    ).toBeInTheDocument();
  });

  it('alinha à direita só as colunas indicadas', () => {
    render(
      <DataTable
        rotulo="Pessoas"
        colunas={colunas}
        dados={[{ id: 1, nome: 'Ana', total: 0 }]}
        getRowId={idDaLinha}
        colunasADireita={['acoes']}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toHaveClass(
      'text-right',
    );
    expect(screen.getByRole('columnheader', { name: 'Nome' })).not.toHaveClass(
      'text-right',
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('atualiza as linhas quando os dados mudam', () => {
    const { rerender } = render(
      <DataTable
        rotulo="Pessoas"
        colunas={colunas}
        dados={[{ id: 1, nome: 'Ana', total: 1 }]}
        getRowId={idDaLinha}
      />,
    );
    rerender(
      <DataTable
        rotulo="Pessoas"
        colunas={colunas}
        dados={[{ id: 2, nome: 'Caio', total: 2 }]}
        getRowId={idDaLinha}
      />,
    );
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.getByText('Caio')).toBeInTheDocument();
  });
});
