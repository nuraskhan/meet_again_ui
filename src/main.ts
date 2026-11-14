import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth, onLogout } from './stores/auth'

// When the session ends (the user logs out, or the server refuses the token), leave the private
// pages.
onLogout(() => {
  if (router.currentRoute.value.meta.requiresAuth === true) {
    void router.push({ name: 'login' })
  }
})

// A token remembered from the last visit: load who it belongs to. If it has expired, the server
// answers 401 and the http layer logs out.
auth.loadProfile().catch(() => {})

createApp(App).use(router).mount('#app')
