<script setup lang="ts">
// What happened that concerns the user: who invited them, who answered, who asked to be a friend.
// New ones appear here by themselves while the page is open (see stores/notifications.ts).

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import type { AppNotification } from '@/api/types'
import UserAvatar from '@/components/UserAvatar.vue'
import { messageTime } from '@/lib/format'
import { notifications } from '@/stores/notifications'
import { toastError } from '@/stores/toast'

const router = useRouter()

const loading = ref<boolean>(true)
const loadingMore = ref<boolean>(false)
const markingAll = ref<boolean>(false)

onMounted(async () => {
  try {
    await notifications.loadList()
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
})

/** Where a notification leads: to the thing it is about. */
function target(notification: AppNotification): RouteLocationRaw {
  switch (notification.kind) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return { name: 'friends' }
    case 'REMOVED_FROM_EVENT':
      // The plan is closed to someone who was removed from it: its page would say "not found".
      return { name: 'plans' }
    default:
      return notification.eventId === null
        ? { name: 'plans' }
        : { name: 'plan', params: { eventId: notification.eventId } }
  }
}

async function open(notification: AppNotification): Promise<void> {
  try {
    await notifications.markRead(notification.id)
  } catch {
    // Not worth stopping for: it stays unread and can be opened again.
  }
  await router.push(target(notification))
}

async function markAll(): Promise<void> {
  markingAll.value = true
  try {
    await notifications.markAllRead()
  } catch (caught) {
    toastError(caught)
  } finally {
    markingAll.value = false
  }
}

async function more(): Promise<void> {
  loadingMore.value = true
  try {
    await notifications.loadMore()
  } catch (caught) {
    toastError(caught)
  } finally {
    loadingMore.value = false
  }
}
</script>

<template>
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">Notifications</h1>
      <button
        v-if="notifications.state.unread > 0"
        class="btn btn--ghost btn--small"
        type="button"
        :disabled="markingAll"
        data-tst-id="notifications-read-all"
        @click="markAll"
      >
        Mark all as read
      </button>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else-if="notifications.state.items.length === 0" class="empty" data-tst-id="notifications-empty">
      <p>Nothing yet. Invitations, answers and friend requests will show up here.</p>
    </div>

    <div v-else class="stack">
      <button
        v-for="notification in notifications.state.items"
        :key="notification.id"
        class="card card--link note"
        :class="{ 'note--unread': !notification.read }"
        type="button"
        data-tst-id="notification"
        @click="open(notification)"
      >
        <UserAvatar
          :name="notification.actorName ?? '?'"
          :user-id="notification.actorId ?? 0"
          :avatar-url="notification.actorAvatarUrl"
          :size="40"
        />
        <span class="grow note__body">
          <span class="note__text" data-tst-id="notification-text">{{ notification.text }}</span>
          <time class="small muted" :datetime="notification.createdAt">
            {{ messageTime(notification.createdAt) }}
          </time>
        </span>
        <span v-if="!notification.read" class="note__dot" aria-label="Unread"></span>
      </button>

      <button
        v-if="notifications.state.hasMore"
        class="btn btn--ghost"
        type="button"
        :disabled="loadingMore"
        data-tst-id="notifications-more"
        @click="more"
      >
        {{ loadingMore ? 'Loading…' : 'Earlier' }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.note {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.note__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.note__text {
  overflow-wrap: anywhere;
}

.note--unread .note__text {
  font-weight: 700;
}

.note__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-accent);
}
</style>
