import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Mini App is served under the site root in production; relative base keeps
// asset URLs origin-agnostic. In dev, /api is proxied to the Bun/Hono server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
