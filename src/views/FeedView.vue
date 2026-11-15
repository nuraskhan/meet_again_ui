<script setup lang="ts">
// The feed: public plans anyone can join. Each card says what the plan is, who invites (their
// picture and name are the way to their profile, with how reliable they are) and who is coming.
// Joining puts the user into the plan's group chat.
//
// With room beside the feed stands a rail: the user's own reliability and their calendar - what
// one looks at before saying "I'm coming". Without the room the head has a way to the calendar.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Clock, MapPin, Plus, Route, Wallet } from 'lucide-vue-next'
import { api, FEED_PAGE } from '@/api'
import type { EventTypeCode, FeedItem, Reliability } from '@/api/types'
import CalendarPanel from '@/components/CalendarPanel.vue'
import EventPicture from '@/components/EventPicture.vue'
import ReliabilityBadge from '@/components/ReliabilityBadge.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { distanceRange, EVENT_TYPE_LOOK, priceRange, proposedTimesSummary } from '@/lib/format'
import { auth } from '@/stores/auth'
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

onMounted(() => load(false))

// ------------------------------------------------------------------ the rail

/**
 * The narrowest page the rail fits in: the rail (320) + the gap (32) + two columns of cards
 * (2 x 340 + 24). With the full sidebar that is a window of about 1400px.
 */
const RAIL_FROM: number = 1056

const page = ref<HTMLElement | null>(null)
/**
 * WHY measured in script and not a media or a container query: the room depends on the sidebar,
 * which the user folds by hand at any window width, so the window's width says too little; and a
 * rail hidden only by CSS would still be mounted - the calendar would load its three lists on
 * every phone for nobody to see.
 */
const railShown = ref<boolean>(false)
let pageWatch: ResizeObserver | null = null

onMounted(() => {
  if (page.value === null || typeof ResizeObserver === 'undefined') {
    return
  }
  pageWatch = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    const width: number | undefined = entries[0]?.contentRect.width
    if (width !== undefined) {
      railShown.value = width >= RAIL_FROM
    }
  })
  pageWatch.observe(page.value)
})

onBeforeUnmount(() => pageWatch?.disconnect())

/** The user's own reliability; null while the profile is on its way. */
const myReliability = computed<Reliability | null>(() => auth.state.profile?.reliability ?? null)

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

/** The plan page is open only to those who are part of the plan; the others join first. */
function canOpen(item: FeedItem): boolean {
  return item.myStanding === 'CREATOR' || item.myStanding === 'ACCEPTED' || item.myStanding === 'PENDING'
}
</script>

<template>
  <div ref="page" class="app-col app-col--rail">
    <div class="feed" :class="{ 'feed--rail': railShown }">
      <div class="feed__main">
        <div class="app-head">
          <h1 class="app-head__title">Feed</h1>
          <!-- Without the rail: the user's reliability in short, and the way to the calendar. -->
          <template v-if="!railShown">
            <ReliabilityBadge :score="myReliability?.score ?? null" compact />
            <RouterLink class="hg-btn hg-btn--outline" :to="{ name: 'calendar' }" data-tst-id="feed-calendar">
              <CalendarDays class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Calendar</span>
            </RouterLink>
          </template>
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
              <!-- The picture is the drawn scene of the activity: the feed has no photograph of a
                   venue to show, so every plan gets the default picture of its kind. The inviter
                   stands on it - face and name lead to their profile - with how reliable they are. -->
              <div class="hg-photo">
                <EventPicture :type="item.eventType" />
                <span class="hg-photo__top">
                  <span class="hg-photo__chip">{{ EVENT_TYPE_LOOK[item.eventType].label }}</span>
                </span>
                <span class="hg-photo__shade feed__shade">
                  <RouterLink
                    class="feed__inviter"
                    :to="{ name: 'person', params: { userId: item.creatorId } }"
                    data-tst-id="feed-inviter"
                  >
                    <UserAvatar
                      :name="item.creatorName"
                      :user-id="item.creatorId"
                      :avatar-url="item.creatorAvatarUrl"
                      :size="40"
                    />
                    <span class="feed__inviter-text"><b>{{ item.creatorName }}</b> invites</span>
                  </RouterLink>
                  <ReliabilityBadge :score="item.creatorReliability" compact />
                </span>
              </div>

              <RouterLink
                v-if="canOpen(item)"
                class="feed__title-link"
                :to="{ name: 'plan', params: { eventId: item.id } }"
              >
                <h2 class="feed__title app-clamp-2">{{ item.title }}</h2>
              </RouterLink>
              <h2 v-else class="feed__title app-clamp-2">{{ item.title }}</h2>

              <p v-if="item.description" class="feed__note app-clamp-2">{{ item.description }}</p>

              <ul class="hg-plan__facts feed__facts">
                <li class="hg-plan__fact" data-tst-id="summary-when">
                  <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  {{ proposedTimesSummary(item.proposedTimes) }}
                </li>
                <!-- The venue, once the organiser has chosen one. The pin is its sign, so the
                     distance below has a sign of its own. -->
                <li v-if="item.placeName" class="hg-plan__fact" data-tst-id="feed-place">
                  <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  <span class="feed__place">{{ item.placeName }}</span>
                </li>
                <li class="hg-plan__fact">
                  <Route class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
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
                    <RouterLink
                      class="hg-btn hg-btn--quiet feed__open"
                      :to="{ name: 'plan', params: { eventId: item.id } }"
                    >
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

      <!-- ---------------------------------------------------------- the rail -->
      <aside v-if="railShown" class="feed__rail" aria-label="Your reliability and calendar" data-tst-id="feed-rail">
        <section class="hg-card feed__reliability" data-tst-id="feed-reliability">
          <h2 class="hg-card__title">Your reliability</h2>
          <template v-if="myReliability !== null">
            <template v-if="myReliability.score !== null">
              <div><ReliabilityBadge :score="myReliability.score" /></div>
              <p class="feed__reliability-text hg-num">
                Kept {{ myReliability.kept }} of {{ myReliability.kept + myReliability.broken }} promises.
              </p>
            </template>
            <p v-else class="feed__reliability-text">Come to three plans and your rating appears here.</p>
          </template>
          <span v-else class="hg-skel hg-skel--line"></span>
        </section>

        <CalendarPanel compact />
      </aside>
    </div>
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

/* ---- the feed and, with room, the rail beside it (see RAIL_FROM in the script) ---- */
.feed__main {
  min-width: 0;
}

.feed--rail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--size-rail);
  gap: var(--s-6);
  align-items: start;
}

/* Beside the rail two cards still stand in a row, a little narrower. */
.feed--rail .feed__grid {
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}

/* The rail has no scrolling of its own - no bars, vertical or horizontal. It is as tall as what
   is in it, and the page is at least that tall: the rail moves with the page like the feed beside
   it. (It used to stay in sight with a scrollbar of its own once it outgrew the window; a second
   scrollbar inside the page was the wrong answer.) */
.feed__rail {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
}

.feed__reliability {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: var(--s-2);
}

.feed__reliability-text {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.feed__item {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}

/* The inviter takes the room on the shade; the badge keeps its own width beside the name. */
.feed__shade {
  justify-content: space-between;
}

.feed__inviter-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* A link on the shade of a picture: it keeps the light colour of the shade, hovered or not. */
.feed__inviter,
.feed__inviter:hover {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
  color: var(--c-on-accent);
}

.feed__place {
  min-width: 0;
  overflow-wrap: anywhere;
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
