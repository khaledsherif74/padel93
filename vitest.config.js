import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['src/main.jsx', 'src/app/ErrorBoundary.jsx'],
    },
  },
});
