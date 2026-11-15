import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `findBy*`/`waitFor` esperam mais que o padrão (1 s) para não oscilar com a máquina ocupada.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
