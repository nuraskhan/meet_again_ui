import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Ports are from the "Ports" table of the backend's CLAUDE.md:
// 19000 = this UI, 29000 = REST server hangelo.
// The application has an address of its own (hangelo.brainb.kz) and lives at its root. Everything
// that builds an address reads this one value (import.meta.env.BASE_URL), so moving the
// application under a path again is a change of this line and of BASE in server.js.
// (For one release, v0.2.0, it lived under /hangelo/; server.js still leads those addresses home.)
const BASE = '/'

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
    // /api/event/list here becomes /event/list on the server.
    proxy: {
      [BASE + 'api']: {
        target: 'http://localhost:29000',
        changeOrigin: true,
        rewrite: (path) => path.slice((BASE + 'api').length) || '/',
      },
    },
  },
})
