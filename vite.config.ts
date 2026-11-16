import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Ports are from the "Ports" table of the backend's CLAUDE.md:
// 19000 = this UI, 29000 = REST server hangelo.
// The application lives under /hangelo/ of its site (brainb.kz/hangelo/), not at the root: the
// root of that site belongs to something else. The same path is used in development, so that an
// address which works here works there. server.js knows the same path.
const BASE = '/hangelo/'

export default defineConfig({
  base: BASE,
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
    // /hangelo/api/event/list here becomes /event/list on the server.
    proxy: {
      [BASE + 'api']: {
        target: 'http://localhost:29000',
        changeOrigin: true,
        rewrite: (path) => path.slice((BASE + 'api').length) || '/',
      },
    },
  },
})
