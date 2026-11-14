import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Ports are from the "Ports" table of the backend's CLAUDE.md:
// 19000 = this UI, 29000 = REST server magain.
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 19000,
    strictPort: true,
    // The browser only ever talks to this origin, so the backend needs no CORS setup:
    // /api/event/list here becomes /event/list on the server.
    proxy: {
      '/api': {
        target: 'http://localhost:29000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
