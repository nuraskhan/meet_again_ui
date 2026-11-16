import { createRouter, createWebHistory } from 'vue-router'
import { api } from './api'
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
  // Under the path the application is served at: see "base" in vite.config.ts.
  history: createWebHistory(import.meta.env.BASE_URL),
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
      // Registered or logged in, but the e-mail is not confirmed: the application is closed, and
      // this is the only page there is - it asks for the code from the letter. It is reached
      // from the login and registration forms only; opened in any other way (a reload, a
      // bookmark) it leads to the login page. See views/ConfirmEmailView.vue.
      path: '/confirm-email',
      name: 'confirm-email',
      component: () => import('./views/ConfirmEmailView.vue'),
    },
    {
      // For developers: where to report a bug, the open issues, how to contribute, the latest
      // release. For everyone, logged in or not.
      path: '/dev',
      name: 'dev',
      component: () => import('./views/DevView.vue'),
    },
    {
      // An invitation opened by its link: for everyone, logged in or not.
      path: '/i/:shareToken',
      name: 'invite',
      component: () => import('./views/InviteView.vue'),
      props: true,
    },
    {
      // The user story (see lib/userStory.ts): the invitation page with the steps it leads to.
      path: '/user-story/i/:shareToken',
      name: 'user-story-invite',
      component: () => import('./views/InviteView.vue'),
      props: true,
    },
    {
      // Everything inside shares the top bar with the navigation.
      path: '/',
      component: () => import('./views/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: 'feed', name: 'feed', component: () => import('./views/FeedView.vue') },
        { path: 'plans', name: 'plans', component: () => import('./views/PlansView.vue') },
        { path: 'plans/new', name: 'plan-new', component: () => import('./views/PlanNewView.vue') },
        {
          path: 'plans/:eventId(\\d+)',
          name: 'plan',
          component: () => import('./views/PlanView.vue'),
          props: (route) => ({ eventId: Number(route.params.eventId) }),
        },
        // The user story: the same pages under the prefix /user-story, where they carry the guide
        // through a plan ("What's next"). Everything of the user story lives under this prefix and
        // nothing of it shows on the general addresses above (see lib/userStory.ts).
        { path: 'user-story', redirect: { name: 'user-story-plans' } },
        { path: 'user-story/plans', name: 'user-story-plans', component: () => import('./views/PlansView.vue') },
        {
          path: 'user-story/plans/new',
          name: 'user-story-plan-new',
          component: () => import('./views/PlanNewView.vue'),
        },
        {
          path: 'user-story/plans/:eventId(\\d+)',
          name: 'user-story-plan',
          component: () => import('./views/PlanView.vue'),
          props: (route) => ({ eventId: Number(route.params.eventId) }),
        },
        // The user's plans and marked days by month.
        { path: 'calendar', name: 'calendar', component: () => import('./views/CalendarView.vue') },
        { path: 'friends', name: 'friends', component: () => import('./views/FriendsView.vue') },
        {
          // The list of chats and, next to it, the open one: ChatsView is the layout of both, so
          // the list stays loaded while moving between chats. The addresses are as before.
          path: 'chats',
          name: 'chats',
          component: () => import('./views/ChatsView.vue'),
          children: [
            {
              path: ':chatId(\\d+)',
              name: 'chat',
              component: () => import('./views/ChatView.vue'),
              props: (route) => ({ chatId: Number(route.params.chatId) }),
            },
          ],
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('./views/NotificationsView.vue'),
        },
        { path: 'profile', name: 'profile', component: () => import('./views/ProfileView.vue') },
        {
          // How the site is visited. The server shows it to admins only.
          path: 'admin/analytica',
          name: 'analytics',
          component: () => import('./views/AnalyticsView.vue'),
        },
        {
          // A person as others see them.
          path: 'people/:userId(\\d+)',
          name: 'person',
          component: () => import('./views/PersonView.vue'),
          props: (route) => ({ userId: Number(route.params.userId) }),
        },
      ],
    },
    { path: '/:rest(.*)*', redirect: { name: 'welcome' } },
  ],
})

router.beforeEach(async (to) => {
  // A remembered token, and nobody has asked the server yet whom it belongs to (the first page
  // after a reload): ask before going anywhere that depends on it. The answer may end the
  // session - an expired token, or an account whose e-mail is not confirmed - and then the
  // person goes to the login page instead of into an application that would answer nothing.
  if (auth.isLoggedIn.value && auth.state.profile === null
      && (to.meta.requiresAuth === true || to.meta.guestOnly === true)) {
    try {
      await auth.loadProfile()
    } catch {
      // The server cannot be reached: go on with what is remembered; the page will say so.
    }
  }

  const loggedIn: boolean = auth.isLoggedIn.value
  // Has an account but has not confirmed the e-mail: neither a visitor nor inside.
  const pending: boolean = auth.isPending.value

  if (to.name === 'confirm-email') {
    return pending ? true : { name: loggedIn ? 'plans' : 'login' }
  }

  if (pending && (to.meta.requiresAuth === true || to.meta.guestOnly === true)) {
    return { name: 'confirm-email' }
  }

  if (to.meta.requiresAuth === true && !loggedIn) {
    // Remember where they were going, to return there after login.
    return { name: 'login', query: { next: to.fullPath } }
  }
  if (to.meta.guestOnly === true && loggedIn) {
    return { name: 'plans' }
  }
  return true
})

// ------------------------------------------------------------------ counting visits
//
// Every page opened is told to the server, for /admin/analytica. What is sent:
//   - the PATTERN of the page ("/plans/:eventId"), never its address: an address can carry a
//     secret (the token of an invitation link) or say which plan a person looked at;
//   - a random id made up here and kept in this browser, which only tells one browser from
//     another.
// A failure is ignored: counting must never get in the way of the page.

const VISITOR_KEY = 'hangelo.visitor'

function visitorId(): string {
  try {
    const known: string | null = localStorage.getItem(VISITOR_KEY)
    if (known !== null && /^[A-Za-z0-9-]{8,64}$/.test(known)) {
      return known
    }
    const made: string = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, made)
    return made
  } catch {
    // No storage (private mode): a new id for every page load. Counted as a new visitor.
    return 'tmp-' + Math.random().toString(36).slice(2, 14).padEnd(12, '0')
  }
}

router.afterEach((to) => {
  // The pattern of the deepest matched route.
  const pattern: string | undefined = to.matched[to.matched.length - 1]?.path
  if (pattern === undefined) {
    return
  }
  // The server takes letters, digits and / : _ . - only: the catch-all's "(.*)*" is not a page.
  const path: string = pattern.replace(/\(.*?\)[*+?]?/g, '').replace(/[^A-Za-z0-9/:_.-]/g, '') || '/'
  void api.visit(visitorId(), path.startsWith('/') ? path : '/' + path).catch(() => {})
})
