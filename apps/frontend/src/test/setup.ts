import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// `findBy*`/`waitFor` esperam mais que o padrão (1 s) para não oscilar com a máquina ocupada.
configure({ asyncUtilTimeout: 5000 });

// jsdom não implementa media queries; cada teste pode substituir este stub.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

// jsdom não tem canvas: os gráficos pulam a renderização e a tabela equivalente segue testável.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as HTMLCanvasElement['getContext'];

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
