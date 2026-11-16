import './assets/main.css'

import { createApp } from 'vue'
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
//
// WHY it waits for the router: a session can end while the very first page is still on its way
// (a remembered token turns out to be of no use before the page has loaded). At that moment the
// router is nowhere yet, "the current page" is not a private one, and nobody would be sent to the
// login page - the person was left inside an application that answered nothing.
onLogout(() => {
  void router.isReady().then(() => {
    if (router.currentRoute.value.meta.requiresAuth === true) {
      void router.replace({ name: 'login' })
    }
  })
})

// A token remembered from the last visit: load who it belongs to. If it has expired, the server
// answers 401 and the http layer logs out. If its account turns out not to have a confirmed e-mail,
// the auth store logs out too: the login page is the way to the confirmation.
auth.loadProfile().catch(() => {})

createApp(App).use(router).mount('#app')
