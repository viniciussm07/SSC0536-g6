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
    },
  }),
);
