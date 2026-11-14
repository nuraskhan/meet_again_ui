import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Only for a logged-in user; others are sent to the login page. */
    requiresAuth?: boolean
    /** Only for a visitor; a logged-in user is sent to their plans. */
    guestOnly?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: () => import('./views/WelcomeView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/AuthView.vue'),
      props: { mode: 'login' },
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('./views/AuthView.vue'),
      props: { mode: 'register' },
      meta: { guestOnly: true },
    },
    {
      // The link from the confirmation letter: for everyone, logged in or not.
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('./views/VerifyEmailView.vue'),
    },
    {
      // An invitation opened by its link: for everyone, logged in or not.
      path: '/i/:shareToken',
      name: 'invite',
      component: () => import('./views/InviteView.vue'),
      props: true,
    },
    {
      // Everything inside shares the top bar with the navigation.
      path: '/',
      component: () => import('./views/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: 'plans', name: 'plans', component: () => import('./views/PlansView.vue') },
        { path: 'plans/new', name: 'plan-new', component: () => import('./views/PlanNewView.vue') },
        {
          path: 'plans/:eventId(\\d+)',
          name: 'plan',
          component: () => import('./views/PlanView.vue'),
          props: (route) => ({ eventId: Number(route.params.eventId) }),
        },
        { path: 'friends', name: 'friends', component: () => import('./views/FriendsView.vue') },
        { path: 'chats', name: 'chats', component: () => import('./views/ChatsView.vue') },
        {
          path: 'chats/:chatId(\\d+)',
          name: 'chat',
          component: () => import('./views/ChatView.vue'),
          props: (route) => ({ chatId: Number(route.params.chatId) }),
        },
        { path: 'profile', name: 'profile', component: () => import('./views/ProfileView.vue') },
      ],
    },
    { path: '/:rest(.*)*', redirect: { name: 'welcome' } },
  ],
})

router.beforeEach((to) => {
  const loggedIn: boolean = auth.isLoggedIn.value

  if (to.meta.requiresAuth === true && !loggedIn) {
    // Remember where they were going, to return there after login.
    return { name: 'login', query: { next: to.fullPath } }
  }
  if (to.meta.guestOnly === true && loggedIn) {
    return { name: 'plans' }
  }
  return true
})
