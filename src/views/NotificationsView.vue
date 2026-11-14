<script setup lang="ts">
// What happened that concerns the user: who invited them, who answered, who asked to be a friend.
// New ones appear here by themselves while the page is open (see stores/notifications.ts).
// They are shown by day - "Today", "Yesterday", then dates - in the time zone of the browser.

import { computed, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { Ban, Bell, Calendar, Check, LogIn, LogOut, UserCheck, UserPlus, X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import type { AppNotification, NotificationKind } from '@/api/types'
import UserAvatar from '@/components/UserAvatar.vue'
import { notifications } from '@/stores/notifications'
import { toastError } from '@/stores/toast'

const router = useRouter()

const loading = ref<boolean>(true)
const loadingMore = ref<boolean>(false)
const markingAll = ref<boolean>(false)

/** The small picture on the avatar: what kind of thing happened. */
const KIND_ICON: Record<NotificationKind, Component> = {
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: UserCheck,
  EVENT_INVITATION: Calendar,
  INVITATION_ACCEPTED: Check,
  INVITATION_DECLINED: X,
  GUEST_JOINED: LogIn,
  GUEST_LEFT: LogOut,
  REMOVED_FROM_EVENT: LogOut,
  EVENT_CANCELLED: Ban,
}

interface DayGroup {
  /** The local date, "2026-10-13": the key of the group. */
  key: string
  label: string
  items: AppNotification[]
}

// The interface is in English, so dates are too - whatever the language of the browser.
const LOCALE = 'en-GB'
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
const dayYearFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** The list is newest first, so the days come out newest first too, each one in one piece. */
const days = computed<DayGroup[]>(() => {
  const now = new Date()
  const groups: DayGroup[] = []
  for (const item of notifications.state.items) {
    const moment = new Date(item.createdAt)
    const key: string = dayKey(moment)
    let group: DayGroup | undefined = groups[groups.length - 1]
    if (group === undefined || group.key !== key) {
      group = { key, label: dayLabel(moment, now), items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})

onMounted(async () => {
  try {
    await notifications.loadList()
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
})

/** The calendar day of a moment where the reader is, not in UTC. */
function dayKey(moment: Date): string {
  return moment.getFullYear() + '-' + (moment.getMonth() + 1) + '-' + moment.getDate()
}

function dayLabel(moment: Date, now: Date): string {
  if (dayKey(moment) === dayKey(now)) {
    return 'Today'
  }
  // The day before by the calendar, not "24 hours ago": correct across a change of the clocks.
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(moment) === dayKey(yesterday)) {
    return 'Yesterday'
  }
  return moment.getFullYear() === now.getFullYear() ? dayFormat.format(moment) : dayYearFormat.format(moment)
}

/** Today: how long ago. On other days the heading says the day, so the time is enough. */
function when(iso: string): string {
  const moment = new Date(iso)
  const now = new Date()
  if (dayKey(moment) !== dayKey(now)) {
    return timeFormat.format(moment)
  }
  const minutes: number = Math.floor((now.getTime() - moment.getTime()) / 60000)
  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : minutes + ' minutes ago'
  }
  const hours: number = Math.floor(minutes / 60)
  return hours === 1 ? '1 hour ago' : hours + ' hours ago'
}

/**
 * The sentence comes whole from the server. When it begins with the name of who did it, the name
 * is shown bold; the rest (or all of it) stays as it is.
 */
function actorPart(notification: AppNotification): string {
  const name: string | null = notification.actorName
  return name !== null && name !== '' && notification.text.startsWith(name) ? name : ''
}

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
  <div class="app-col">
    <div class="app-head">
      <h1 class="app-head__title">Notifications</h1>
      <button
        v-if="notifications.state.unread > 0"
        class="hg-btn hg-btn--quiet"
        :class="{ 'is-loading': markingAll }"
        type="button"
        :disabled="markingAll"
        data-tst-id="notifications-read-all"
        @click="markAll"
      >
        <span>Mark all as read</span>
      </button>
    </div>

    <!-- Loading: the shape of the list, so the page does not jump when it arrives. -->
    <ul v-if="loading" class="hg-list notes__list" aria-busy="true" aria-label="Loading notifications">
      <li v-for="n in 5" :key="n" class="hg-row hg-row--72 notes__row">
        <span class="hg-skel hg-skel--circle notes__skel-avatar"></span>
        <span class="hg-row__text notes__text notes__skel-text">
          <span class="hg-skel hg-skel--line notes__skel-title"></span>
          <span class="hg-skel hg-skel--line notes__skel-time"></span>
        </span>
      </li>
    </ul>

    <div v-else-if="notifications.state.items.length === 0" class="hg-empty" data-tst-id="notifications-empty">
      <Bell class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <h2 class="hg-empty__title">Nothing yet</h2>
      <p class="hg-empty__text">Invitations, answers and friend requests will show up here.</p>
    </div>

    <template v-else>
      <div class="notes">
        <template v-for="group in days" :key="group.key">
          <h2 class="notes__day">{{ group.label }}</h2>
          <ul class="hg-list notes__list">
            <li v-for="notification in group.items" :key="notification.id">
              <!-- A real link (it can be opened in a new tab), but a click goes through open():
                   the notification is marked as read on the way. -->
              <a
                class="hg-row hg-row--72 hg-row--link notes__row"
                :class="{ 'hg-row--new': !notification.read }"
                :href="router.resolve(target(notification)).href"
                data-tst-id="notification"
                @click.prevent="open(notification)"
              >
                <span class="hg-avatar-wrap">
                  <UserAvatar
                    :name="notification.actorName ?? '?'"
                    :user-id="notification.actorId ?? 0"
                    :avatar-url="notification.actorAvatarUrl"
                    :size="40"
                  />
                  <span class="hg-avatar__kind">
                    <component
                      :is="KIND_ICON[notification.kind] ?? Bell"
                      class="hg-icon"
                      :stroke-width="1.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
                <span class="hg-row__text notes__text">
                  <!-- On one line: the text of this element is exactly the sentence of the server. -->
                  <span class="notes__sentence" data-tst-id="notification-text"><b v-if="actorPart(notification) !== ''">{{ actorPart(notification) }}</b>{{ notification.text.slice(actorPart(notification).length) }}</span>
                  <time class="hg-row__time" :datetime="notification.createdAt">{{ when(notification.createdAt) }}</time>
                </span>
                <span v-if="!notification.read" class="hg-row__trail">
                  <span class="hg-dot"></span>
                  <span class="hg-sr">Unread</span>
                </span>
              </a>
            </li>
          </ul>
        </template>
      </div>

      <div v-if="notifications.state.hasMore" class="notes__more">
        <button
          class="hg-btn hg-btn--quiet"
          :class="{ 'is-loading': loadingMore }"
          type="button"
          :disabled="loadingMore"
          data-tst-id="notifications-more"
          @click="more"
        >
          <span>Earlier</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The first day heading sits right under the title: its own top margin is taken back. */
.notes {
  margin-top: calc(var(--s-5) * -1);
}

.notes__day {
  margin: var(--s-5) 0 var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-caption);
}

.notes__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* A row is a link, but reads as text: the stylesheet colours every link. */
.notes__row,
.notes__row:hover {
  border-radius: var(--r-m);
  color: var(--c-ink);
}

/* Rows here are separate rounded pieces, so no line between them. */
.notes__text {
  border-bottom: 0;
}

/* A sentence with a long plan title wraps instead of being cut: it is the whole message. */
.notes__sentence {
  font: var(--t-body);
  overflow-wrap: anywhere;
}

.notes__more {
  display: flex;
  justify-content: center;
  margin-top: var(--s-5);
}

.notes__skel-avatar {
  flex: none;
  width: var(--size-control);
  height: var(--size-control);
}

.notes__skel-text {
  gap: var(--s-2);
}

.notes__skel-title {
  width: 60%;
}

.notes__skel-time {
  width: 20%;
}

@media (max-width: 767px) {
  /* The page already has a gutter on a phone: a narrower row padding leaves room for the text. */
  .notes__row {
    padding: 0 var(--s-2);
  }
}
</style>
