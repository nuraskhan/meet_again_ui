import './assets/main.css'

import { createApp, watch } from 'vue'
import App from './App.vue'
import { router } from './router'
import { auth, onLogout } from './stores/auth'
// Loaded for what it starts: the stream of signals from the server and the count on the bell,
// both following the session from here on.
import './stores/notifications'
// Loaded for what it starts: the chats with their newest messages and unread counts.
import './stores/chats'
// Loaded for what it starts: keeps the theme (light or dark) on the page.
import './stores/theme'

// When the session ends (the user logs out, or the server refuses the token), leave the private
// pages.
onLogout(() => {
  if (router.currentRoute.value.meta.requiresAuth === true) {
    void router.push({ name: 'login' })
  }
})

// The e-mail turned out not to be confirmed (an account from before confirming became required,
// found out when its profile loaded): out of the private pages, to the one page there is.
watch(
  () => auth.isPending.value,
  (pending) => {
    if (pending && router.currentRoute.value.meta.requiresAuth === true) {
      void router.replace({ name: 'confirm-email' })
    }
  },
)

// A token remembered from the last visit: load who it belongs to. If it has expired, the server
// answers 401 and the http layer logs out.
auth.loadProfile().catch(() => {})

createApp(App).use(router).mount('#app')
