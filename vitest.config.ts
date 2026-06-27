import { defineConfig } from 'vitest/config';

// 100% coverage on the logic surface (options resolver, interceptor, filter,
// module, decorator, envelope-body, tokens). Type-only files (barrel, types) are
// excluded. Do not lower a threshold to make a build pass — add the missing test.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts', 'src/**/*.{test,spec}.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100
      }
    }
  }
});
