import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, type CorBadge } from '.';

describe('Badge OTO', () => {
  it.each<CorBadge>([
    'azul',
    'laranja',
    'amarelo',
    'vermelho',
    'cinza',
    'escuro',
  ])('preserva legenda, atributos acessíveis e cor %s', (cor) => {
    render(
      <Badge
        cor={cor}
        title="Situação do cadastro"
        aria-label="Cadastro pendente"
      >
        Pendente
      </Badge>,
    );
    const badge = screen.getByLabelText('Cadastro pendente');
    expect(badge).toHaveTextContent('Pendente');
    expect(badge).toHaveAttribute('data-cor', cor);
    expect(badge).toHaveAttribute('title', 'Situação do cadastro');
    expect(badge.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
  it('permite categorias sem marcador e encaminha ref e classes', () => {
    let elemento: HTMLSpanElement | null = null;
    render(
      <Badge
        ponto={false}
        className="uppercase"
        ref={(node) => {
          elemento = node;
        }}
      >
        Hotel
      </Badge>,
    );
    expect(elemento).toBe(screen.getByText('Hotel'));
    expect(elemento).toHaveClass('uppercase');
    expect(screen.getByText('Hotel').querySelector('[aria-hidden]')).toBeNull();
  });
});
