import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^react$/,
        replacement: fileURLToPath(new URL('./node_modules/react/index.js', import.meta.url)),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: fileURLToPath(
          new URL('./node_modules/react/jsx-runtime.js', import.meta.url)
        ),
      },
      {
        find: /^react-dom$/,
        replacement: fileURLToPath(new URL('./node_modules/react-dom/index.js', import.meta.url)),
      },
      {
        find: /^react-dom\/client$/,
        replacement: fileURLToPath(
          new URL('./node_modules/react-dom/client.js', import.meta.url)
        ),
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    passWithNoTests: true,
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'website/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'website/src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'website/src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/index.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
});
