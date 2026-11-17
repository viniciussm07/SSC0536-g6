import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
      // Telas com diálogos e formulários grandes levam mais de 5 s quando a CI/máquina está carregada.
      testTimeout: 20_000,
      // Só é gerada com `--coverage` (usado na CI); o resumo lê coverage-summary.json.
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/components/ui/**',
        ],
        reporter: ['text-summary', 'json-summary'],
      },
    },
  }),
);
