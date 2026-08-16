import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'e2e' ? '/clash-override/' : undefined,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    open: true,
    fs: { allow: ['..'] },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
}))
