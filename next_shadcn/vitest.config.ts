import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Mirror tsconfig's "@/*" path alias so route modules resolve in tests
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,js}'],
  },
});
