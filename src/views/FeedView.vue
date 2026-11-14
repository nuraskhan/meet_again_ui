<script setup lang="ts">
// The feed: public plans anyone can join. Each card says what the plan is, who invites (their
// profile is one tap away) and who is coming. Joining puts the user into the plan's group chat.

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, FEED_PAGE } from '@/api'
import type { EventTypeCode, FeedItem } from '@/api/types'
import EventSummary from '@/components/EventSummary.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { date, EVENT_TYPE_LOOK } from '@/lib/format'
import { toastError, toastOk } from '@/stores/toast'

const router = useRouter()

const TYPES: EventTypeCode[] = ['BATH', 'FOOD', 'COFFEE', 'BAR', 'WALK', 'CINEMA', 'SPORT', 'BOARD_GAMES', 'OTHER']

const items = ref<FeedItem[]>([])
/** Only plans of this type; null = all. */
const type = ref<EventTypeCode | null>(null)
const loading = ref<boolean>(true)
const loadingMore = ref<boolean>(false)
/** The last page came full: there may be older plans. */
const hasMore = ref<boolean>(false)
/** The plan being joined right now, to disable its button. */
const joining = ref<number | null>(null)

onMounted(() => load(false))

/** @param more false = start over from the newest; true = add the next page */
async function load(more: boolean): Promise<void> {
  if (more) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  try {
    const last: FeedItem | undefined = items.value[items.value.length - 1]
    const page: FeedItem[] = await api.feed(type.value, more && last !== undefined ? last.id : null)
    items.value = more ? [...items.value, ...page] : page
    hasMore.value = page.length === FEED_PAGE
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function pick(chosen: EventTypeCode | null): Promise<void> {
  type.value = chosen
  await load(false)
}

async function join(item: FeedItem): Promise<void> {
  joining.value = item.id
  try {
    await api.joinPublicEvent(item.id)
    toastOk('You are in! The chat is waiting.')
    await router.push({ name: 'plan', params: { eventId: item.id } })
  } catch (caught) {
    toastError(caught)
    // The plan may have filled up or been cancelled meanwhile: show it as it is now.
    await load(false)
  } finally {
    joining.value = null
  }
}

/** "3 are in", "1 is in", or an invitation to be the first. */
function crowd(item: FeedItem): string {
  if (item.goingCount === 0) {
    return 'Be the first to join'
  }
  return item.goingCount + (item.goingCount === 1 ? ' is in' : ' are in')
}
</script>

<template>
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">Feed</h1>
      <RouterLink class="btn" :to="{ name: 'plan-new', query: { public: '1' } }" data-tst-id="feed-new">
        + Invite everyone
      </RouterLink>
    </div>

    <p class="muted feed__lead">Plans open to everybody. Join one and you are in its group chat.</p>

    <!-- ------------------------------------------------------------ filter -->
    <div class="feed__types" role="group" aria-label="Filter by activity">
      <button
        class="chip feed__type"
        :class="{ 'feed__type--on': type === null }"
        type="button"
        :aria-pressed="type === null"
        data-tst-id="feed-type-all"
        @click="pick(null)"
      >
        All
      </button>
      <button
        v-for="candidate in TYPES"
        :key="candidate"
        class="chip feed__type"
        :class="{ 'feed__type--on': type === candidate }"
        type="button"
        :aria-pressed="type === candidate"
        :data-tst-id="'feed-type-' + candidate"
        @click="pick(candidate)"
      >
        <span aria-hidden="true">{{ EVENT_TYPE_LOOK[candidate].icon }}</span>
        {{ EVENT_TYPE_LOOK[candidate].label }}
      </button>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else-if="items.length === 0" class="empty" data-tst-id="feed-empty">
      <p class="feed__empty-title">Nothing here yet</p>
      <p>{{ type === null ? 'No public plans right now.' : 'No public plans of this kind right now.' }}</p>
      <RouterLink class="btn feed__empty-button" :to="{ name: 'plan-new', query: { public: '1' } }">
        Start one
      </RouterLink>
    </div>

    <div v-else class="stack">
      <article v-for="item in items" :key="item.id" class="card" data-tst-id="feed-item">
        <!-- Who invites: the way to their profile. -->
        <RouterLink
          class="inviter"
          :to="{ name: 'person', params: { userId: item.creatorId } }"
          data-tst-id="feed-inviter"
        >
          <UserAvatar :name="item.creatorName" :user-id="item.creatorId" :avatar-url="item.creatorAvatarUrl" :size="44" />
          <span class="grow">
            <span class="inviter__name">{{ item.creatorName }}</span>
            <span class="small muted inviter__sub">
              {{ item.creatorCity ? item.creatorCity + ' · ' : '' }}invites everyone · {{ date(item.createdAt) }}
            </span>
          </span>
          <span class="small inviter__profile">Profile →</span>
        </RouterLink>

        <EventSummary :event="item" />

        <p v-if="item.description" class="feed__note">{{ item.description }}</p>

        <div class="row feed__foot">
          <!-- Who is coming: a few faces, each a way to a profile, and the count. -->
          <span class="faces">
            <RouterLink
              v-for="person in item.going"
              :key="person.userId"
              class="faces__face"
              :to="{ name: 'person', params: { userId: person.userId } }"
              :aria-label="person.displayName"
              :title="person.displayName"
            >
              <UserAvatar :name="person.displayName" :user-id="person.userId" :avatar-url="person.avatarUrl" :size="30" />
            </RouterLink>
          </span>
          <span class="small muted" data-tst-id="feed-crowd">{{ crowd(item) }}</span>

          <span class="feed__action">
            <RouterLink
              v-if="item.myStanding === 'CREATOR'"
              class="btn btn--ghost btn--small"
              :to="{ name: 'plan', params: { eventId: item.id } }"
            >
              Your plan
            </RouterLink>

            <RouterLink
              v-else-if="item.myStanding === 'ACCEPTED' || item.myStanding === 'PENDING'"
              class="btn btn--ghost btn--small"
              :to="{ name: 'plan', params: { eventId: item.id } }"
              data-tst-id="feed-open"
            >
              {{ item.myStanding === 'ACCEPTED' ? "You're in · open" : 'You are invited · open' }}
            </RouterLink>

            <span v-else-if="item.myStanding === 'REMOVED'" class="badge badge--no">Not available to you</span>

            <span v-else-if="item.full" class="badge">Full</span>

            <button
              v-else
              class="btn btn--yes btn--small"
              type="button"
              :disabled="joining === item.id"
              data-tst-id="feed-join"
              @click="join(item)"
            >
              {{ joining === item.id ? 'Joining…' : item.myStanding === 'DECLINED' ? 'Join again' : 'Join' }}
            </button>
          </span>
        </div>
      </article>

      <div v-if="hasMore" class="feed__more">
        <button class="btn btn--ghost" type="button" :disabled="loadingMore" data-tst-id="feed-more" @click="load(true)">
          {{ loadingMore ? 'Loading…' : 'Show older' }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.feed__lead {
  margin: -10px 0 16px;
}

.feed__types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.feed__type {
  flex: none;
  cursor: pointer;
}

.feed__type:hover {
  border-color: var(--c-accent);
}

.feed__type--on,
.feed__type--on:hover {
  border-color: var(--c-accent);
  background: var(--c-accent-soft);
  color: var(--c-accent);
  font-weight: 700;
}

.inviter {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-line);
  color: inherit;
}

.inviter:hover {
  color: inherit;
}

.inviter__name {
  display: block;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.inviter__sub {
  display: block;
}

.inviter__profile {
  flex: none;
  color: var(--c-accent);
  font-weight: 600;
}

.feed__note {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-s);
  background: var(--c-surface-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.feed__foot {
  margin-top: 14px;
}

.faces {
  display: inline-flex;
}

.faces:empty {
  display: none;
}

.faces__face {
  display: inline-flex;
  margin-right: -8px;
  border: 2px solid var(--c-surface);
  border-radius: 50%;
}

.faces__face:last-child {
  margin-right: 0;
}

.feed__action {
  margin-left: auto;
}

.feed__more {
  margin-top: 4px;
  text-align: center;
}

.feed__empty-title {
  margin-bottom: 4px;
  color: var(--c-ink);
  font-size: 1.1rem;
  font-weight: 700;
}

.feed__empty-button {
  margin-top: 16px;
}
</style>
