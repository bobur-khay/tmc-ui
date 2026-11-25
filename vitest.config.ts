import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const isCI = !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: `${import.meta.dirname.replaceAll('\\', '/')}/` }],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    reporters: isCI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'reports/vitest-junit.xml' },
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/types.ts', '**/*Types.ts'],
      reporter: ['text', 'html', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
    },
  },
});
