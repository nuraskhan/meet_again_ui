// The notifications of the logged-in person: how many are unread (the number on the bell) and the
// list. New ones arrive by signal while the page is open; everything is read from the server again
// at login and after a break in the connection.

import { reactive, watch } from 'vue'
import { api, NOTIFICATION_PAGE } from '@/api'
import type { AppNotification } from '@/api/types'
import { auth } from '@/stores/auth'
import { onSignal, RECONNECTED } from '@/stores/signal'
import { toastOk } from '@/stores/toast'

interface NotificationState {
  unread: number
  /** Newest first. Empty until the notifications page was opened once. */
  items: AppNotification[]
  listLoaded: boolean
  hasMore: boolean
}

const state: NotificationState = reactive({ unread: 0, items: [], listLoaded: false, hasMore: false })

export const notifications = {
  state,

  /** Loads the newest page; called by the notifications page when it opens. */
  async loadList(): Promise<void> {
    const page: AppNotification[] = await api.notifications()
    state.items = page
    state.hasMore = page.length === NOTIFICATION_PAGE
    state.listLoaded = true
  },

  async loadMore(): Promise<void> {
    const last: AppNotification | undefined = state.items[state.items.length - 1]
    if (last === undefined) {
      return
    }
    const page: AppNotification[] = await api.notifications(last.id)
    state.items.push(...page)
    state.hasMore = page.length === NOTIFICATION_PAGE
  },

  async markRead(id: number): Promise<void> {
    const item: AppNotification | undefined = state.items.find((candidate) => candidate.id === id)
    if (item !== undefined && item.read) {
      return
    }
    state.unread = (await api.markNotificationRead(id)).count
    if (item !== undefined) {
      item.read = true
    }
  },

  async markAllRead(): Promise<void> {
    await api.markAllNotificationsRead()
    state.unread = 0
    for (const item of state.items) {
      item.read = true
    }
  },
}

async function refresh(): Promise<void> {
  try {
    state.unread = (await api.unreadNotificationCount()).count
    if (state.listLoaded) {
      await notifications.loadList()
    }
  } catch {
    // The bell keeps what it showed; the next signal or reload corrects it.
  }
}

onSignal<AppNotification>('notification', (notification) => {
  state.unread = state.unread + 1
  if (state.listLoaded && !state.items.some((item) => item.id === notification.id)) {
    state.items.unshift(notification)
  }
  toastOk(notification.text)
})

onSignal(RECONNECTED, () => void refresh())

// Another person logging in on this browser must not see the previous one's bell.
watch(
  () => auth.state.token,
  (token) => {
    state.unread = 0
    state.items = []
    state.listLoaded = false
    state.hasMore = false
    if (token !== null) {
      void refresh()
    }
  },
  { immediate: true },
)
