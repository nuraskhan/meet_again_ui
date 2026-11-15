<script setup lang="ts">
// The feed: public plans anyone can join. Each card says what the plan is, who invites (their
// picture and name are the way to their profile) and who is coming. Joining puts the user into the
// plan's group chat.

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Clock, MapPin, Plus, Wallet } from 'lucide-vue-next'
import { api, FEED_PAGE } from '@/api'
import { serverFileUrl } from '@/api/http'
import type { EventTypeCode, FeedItem } from '@/api/types'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { distanceRange, EVENT_TYPE_LOOK, priceRange, proposedTimesSummary } from '@/lib/format'
import { toastError, toastOk } from '@/stores/toast'

const router = useRouter()

const TYPES: EventTypeCode[] = ['BATH', 'FOOD', 'COFFEE', 'BAR', 'WALK', 'CINEMA', 'SPORT', 'BOARD_GAMES', 'OTHER']

/** How many cards the skeleton shows while the first page is on its way. */
const SKELETONS: number = 4

const items = ref<FeedItem[]>([])
/** Only plans of this type; null = all. */
const type = ref<EventTypeCode | null>(null)
const loading = ref<boolean>(true)
const loadingMore = ref<boolean>(false)
/** The last page came full: there may be older plans. */
const hasMore = ref<boolean>(false)
/** The plan being joined right now, to disable its button. */
const joining = ref<number | null>(null)
/** Plans whose picture failed to load (removed meanwhile): they are shown as plans without one. */
const brokenPhotos = ref<Set<number>>(new Set<number>())

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
    const answer = await api.joinPublicEvent(item.id)
    if (answer.standing === 'REQUESTED') {
      // A public plan is open to ask about: the organiser decides who comes.
      item.myStanding = 'REQUESTED'
      toastOk('Request sent. The organiser will answer.')
      return
    }
    // Invited by name before: asking was their yes.
    toastOk('You are coming. The chat is open for you.')
    await router.push({ name: 'plan', params: { eventId: item.id } })
  } catch (caught) {
    toastError(caught)
    // The plan may have filled up or been cancelled meanwhile: show it as it is now.
    await load(false)
  } finally {
    joining.value = null
  }
}

/** Taking back a request that the organiser has not answered yet. */
async function takeBack(item: FeedItem): Promise<void> {
  joining.value = item.id
  try {
    await api.leaveEvent(item.id)
    item.myStanding = 'DECLINED'
    toastOk('Request taken back.')
  } catch (caught) {
    toastError(caught)
    await load(false)
  } finally {
    joining.value = null
  }
}

/** "3 coming", or an invitation to be the first. */
function crowd(item: FeedItem): string {
  if (item.goingCount === 0) {
    return 'Be the first to join'
  }
  return item.goingCount + ' coming'
}

/** The picture on the card is the inviter's own; null = none, or it did not load. */
function photo(item: FeedItem): string | null {
  return brokenPhotos.value.has(item.id) ? null : serverFileUrl(item.creatorAvatarUrl)
}

function photoFailed(item: FeedItem): void {
  brokenPhotos.value = new Set<number>([...brokenPhotos.value, item.id])
}

/** The plan page is open only to those who are part of the plan; the others join first. */
function canOpen(item: FeedItem): boolean {
  return item.myStanding === 'CREATOR' || item.myStanding === 'ACCEPTED' || item.myStanding === 'PENDING'
}
</script>

<template>
  <div class="app-col app-col--wide">
    <div class="app-head">
      <h1 class="app-head__title">Feed</h1>
      <RouterLink
        class="hg-btn hg-btn--neutral feed__new"
        :to="{ name: 'plan-new', query: { public: '1' } }"
        data-tst-id="feed-new"
      >
        <Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span>New public plan</span>
      </RouterLink>
    </div>

    <!-- ------------------------------------------------------------ filter -->
    <div class="feed__types" role="group" aria-label="Filter by activity">
      <button
        class="hg-chip feed__type"
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
        class="hg-chip feed__type"
        type="button"
        :aria-pressed="type === candidate"
        :data-tst-id="'feed-type-' + candidate"
        @click="pick(candidate)"
      >
        {{ EVENT_TYPE_LOOK[candidate].label }}
      </button>
    </div>

    <!-- ------------------------------------------------------------ loading: the shape of the cards -->
    <div v-if="loading" class="feed__grid" aria-busy="true">
      <span class="hg-sr">Loading the plans</span>
      <div v-for="index in SKELETONS" :key="index" class="feed__item" aria-hidden="true">
        <span class="hg-skel feed__skel-photo"></span>
        <span class="hg-skel feed__skel-title"></span>
        <span class="hg-skel hg-skel--line feed__skel-line"></span>
        <span class="hg-skel hg-skel--line feed__skel-line feed__skel-line--short"></span>
        <div class="feed__foot">
          <span class="hg-skel hg-skel--circle feed__skel-face"></span>
          <span class="hg-skel hg-skel--line feed__skel-crowd"></span>
        </div>
      </div>
    </div>

    <div v-else-if="items.length === 0" class="hg-empty" data-tst-id="feed-empty">
      <CalendarDays class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <h2 class="hg-empty__title">{{ type === null ? 'No public plans yet' : 'No plans of this kind' }}</h2>
      <p class="hg-empty__text">
        {{
          type === null
            ? 'Nobody has invited everyone yet. You can be the first.'
            : 'There are no public plans of this kind right now. You can start one.'
        }}
      </p>
      <RouterLink class="hg-btn hg-btn--primary feed__start" :to="{ name: 'plan-new', query: { public: '1' } }">
        <span>New public plan</span>
      </RouterLink>
    </div>

    <template v-else>
      <div class="feed__grid">
        <article v-for="item in items" :key="item.id" class="feed__item" data-tst-id="feed-item">
          <!-- With a picture: the inviter stands on it, and the whole picture leads to their profile. -->
          <RouterLink
            v-if="photo(item) !== null"
            class="hg-photo feed__photo"
            :to="{ name: 'person', params: { userId: item.creatorId } }"
            data-tst-id="feed-inviter"
          >
            <img :src="photo(item) ?? undefined" alt="" loading="lazy" @error="photoFailed(item)" />
            <span class="hg-photo__top">
              <span class="hg-photo__chip">{{ EVENT_TYPE_LOOK[item.eventType].label }}</span>
            </span>
            <span class="hg-photo__shade">
              <UserAvatar :name="item.creatorName" :user-id="item.creatorId" :size="40" />
              <span class="feed__inviter-text"><b>{{ item.creatorName }}</b> invites</span>
            </span>
          </RouterLink>

          <!-- Without one: the activity's icon in its place, and the inviter in a line below. -->
          <template v-else>
            <div class="hg-photo">
              <span class="hg-photo__top">
                <span class="hg-photo__chip">{{ EVENT_TYPE_LOOK[item.eventType].label }}</span>
              </span>
              <span class="hg-photo__empty">
                <EventTypeIcon :type="item.eventType" :size="48" />
              </span>
            </div>
            <RouterLink
              class="feed__inviter"
              :to="{ name: 'person', params: { userId: item.creatorId } }"
              data-tst-id="feed-inviter"
            >
              <UserAvatar :name="item.creatorName" :user-id="item.creatorId" :size="24" />
              <span class="feed__inviter-text"><b>{{ item.creatorName }}</b> invites</span>
            </RouterLink>
          </template>

          <RouterLink v-if="canOpen(item)" class="feed__title-link" :to="{ name: 'plan', params: { eventId: item.id } }">
            <h2 class="feed__title app-clamp-2">{{ item.title }}</h2>
          </RouterLink>
          <h2 v-else class="feed__title app-clamp-2">{{ item.title }}</h2>

          <p v-if="item.description" class="feed__note app-clamp-2">{{ item.description }}</p>

          <ul class="hg-plan__facts feed__facts">
            <li class="hg-plan__fact" data-tst-id="summary-when">
              <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              {{ proposedTimesSummary(item.proposedTimes) }}
            </li>
            <li class="hg-plan__fact">
              <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              {{ distanceRange(item.distanceMinMi, item.distanceMaxMi) }}
            </li>
            <li class="hg-plan__fact">
              <Wallet class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              {{ priceRange(item.priceMin, item.priceMax) }}
            </li>
          </ul>

          <div class="feed__foot">
            <!-- Who is coming: a few faces, each a way to a profile, and the count. -->
            <span class="feed__crowd">
              <span v-if="item.going.length > 0" class="hg-stack">
                <RouterLink
                  v-for="person in item.going"
                  :key="person.userId"
                  class="feed__face"
                  :to="{ name: 'person', params: { userId: person.userId } }"
                  :aria-label="person.displayName"
                  :title="person.displayName"
                >
                  <UserAvatar
                    :name="person.displayName"
                    :user-id="person.userId"
                    :avatar-url="person.avatarUrl"
                    :size="32"
                  />
                </RouterLink>
              </span>
              <span class="feed__count hg-num" data-tst-id="feed-crowd">{{ crowd(item) }}</span>
            </span>

            <span class="feed__action">
              <template v-if="item.myStanding === 'CREATOR'">
                <span class="hg-badge">You organise</span>
                <RouterLink class="hg-btn hg-btn--quiet feed__open" :to="{ name: 'plan', params: { eventId: item.id } }">
                  <span>Open</span>
                </RouterLink>
              </template>

              <template v-else-if="item.myStanding === 'ACCEPTED' || item.myStanding === 'PENDING'">
                <span v-if="item.myStanding === 'ACCEPTED'" class="hg-badge hg-badge--success">You are coming</span>
                <span v-else class="hg-badge hg-badge--warning">You are invited</span>
                <RouterLink
                  class="hg-btn hg-btn--quiet feed__open"
                  :to="{ name: 'plan', params: { eventId: item.id } }"
                  data-tst-id="feed-open"
                >
                  <span>Open</span>
                </RouterLink>
              </template>

              <template v-else-if="item.myStanding === 'REQUESTED'">
                <span class="hg-badge hg-badge--warning" data-tst-id="feed-requested">Request sent</span>
                <button
                  class="hg-btn hg-btn--quiet"
                  :class="{ 'is-loading': joining === item.id }"
                  type="button"
                  :disabled="joining === item.id"
                  data-tst-id="feed-take-back"
                  @click="takeBack(item)"
                >
                  <span>Take back</span>
                </button>
              </template>

              <span v-else-if="item.myStanding === 'REMOVED'" class="hg-badge hg-badge--danger">
                Not available to you
              </span>

              <span v-else-if="item.full" class="hg-btn hg-btn--quiet is-disabled feed__full" aria-disabled="true">
                Full
              </span>

              <button
                v-else
                class="hg-btn hg-btn--primary"
                :class="{ 'is-loading': joining === item.id }"
                type="button"
                :disabled="joining === item.id"
                data-tst-id="feed-join"
                @click="join(item)"
              >
                <span>{{ item.myStanding === 'DECLINED' ? 'Ask again' : 'Ask to join' }}</span>
              </button>
            </span>
          </div>
        </article>
      </div>

      <div v-if="hasMore" class="feed__more">
        <button
          class="hg-btn hg-btn--quiet"
          :class="{ 'is-loading': loadingMore }"
          type="button"
          :disabled="loadingMore"
          data-tst-id="feed-more"
          @click="load(true)"
        >
          <span>Show older</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* main.css colours every link, and every hovered link, as a text link: the links that are buttons
 * keep the colours of their button. */
.feed__new:hover {
  color: var(--c-on-ink);
}

.feed__start:hover {
  color: var(--c-on-accent);
}

.feed__open:hover {
  color: var(--c-ink);
}

/* One line that scrolls sideways; the padding keeps the focus ring of a chip from being cut. */
.feed__types {
  display: flex;
  gap: var(--s-2);
  overflow-x: auto;
  margin: calc(-1 * var(--s-4)) 0 var(--s-5);
  padding: var(--s-1) 2px;
}

.feed__type {
  flex: none;
}

.feed__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr));
  gap: var(--s-5);
}

.feed__item {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}

.feed__photo,
.feed__photo:hover {
  color: var(--c-ink);
}

.feed__inviter-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.feed__inviter,
.feed__inviter:hover {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  color: var(--c-ink);
  font: var(--t-small);
}

.feed__title-link,
.feed__title-link:hover {
  color: var(--c-ink);
}

.feed__title {
  font: var(--t-title-2);
  overflow-wrap: anywhere;
}

.feed__note {
  color: var(--c-ink-soft);
  overflow-wrap: anywhere;
}

.feed__facts {
  font: var(--t-small);
}

.feed__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-1);
}

.feed__crowd {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
}

/* The faces are links, so the overlap and the ring the stack gives its avatars are repeated here. */
.feed__face {
  display: inline-flex;
  border-radius: var(--r-full);
}

.feed__face + .feed__face {
  margin-left: calc(-1 * var(--s-2));
}

.feed__face :deep(.hg-avatar) {
  box-shadow: 0 0 0 2px var(--c-page);
}

.feed__count {
  font: var(--t-small);
  font-variant-numeric: tabular-nums;
}

.feed__action {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--s-2);
}

/* Not a button that is switched off for a while, but a plain statement: no fading. */
.feed__full {
  opacity: 1;
}

.feed__more {
  display: flex;
  justify-content: center;
  margin-top: var(--s-6);
}

/* ---- skeleton: a card before it has come ---- */
.feed__skel-photo {
  aspect-ratio: 16 / 9;
  border-radius: var(--r-l);
}

.feed__skel-title {
  width: 70%;
  height: var(--s-5);
}

.feed__skel-line {
  width: 90%;
}

.feed__skel-line--short {
  width: 50%;
}

.feed__skel-face {
  width: var(--size-control-sm);
  height: var(--size-control-sm);
}

.feed__skel-crowd {
  width: var(--s-8);
}

@media (max-width: 767px) {
  .feed__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* The chips run to the edges of the screen instead of being cut at the page padding. */
  .feed__types {
    margin-left: calc(-1 * var(--s-4));
    margin-right: calc(-1 * var(--s-4));
    padding-left: var(--s-4);
    padding-right: var(--s-4);
  }

  .feed__new {
    width: 100%;
  }
}

/* The row of filters scrolls by touch or wheel; a scrollbar under it would only take room. */
.feed__types {
  scrollbar-width: none;
}

.feed__types::-webkit-scrollbar {
  display: none;
}
</style>
