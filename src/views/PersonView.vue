<script setup lang="ts">
// A person as others see them: the photos at the left, their story at the right (about, facts,
// interests, prompts), and what the user can do about being friends with them. Also how the user
// sees their own profile "from outside".

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import {
  Briefcase,
  Check,
  GraduationCap,
  House,
  Languages,
  Pencil,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
} from 'lucide-vue-next'
import { api } from '@/api'
import { ApiError, serverFileUrl } from '@/api/http'
import type { AvailabilityKind, FriendAvailability, Profile } from '@/api/types'
import ReliabilityBadge from '@/components/ReliabilityBadge.vue'
import { addDays, availabilityPhrase, dayRange, today } from '@/lib/dates'
import { initials } from '@/lib/format'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const props = defineProps<{ userId: number }>()

const person = ref<Profile | null>(null)
const loading = ref<boolean>(true)
const missing = ref<boolean>(false)
/** Which photo is shown large. */
const shown = ref<number>(0)

const isMe = computed<boolean>(() => props.userId === auth.state.userId)

interface Fact {
  icon: Component
  text: string
}

/** The facts that are given, one a line. The city is not here: it stands on the photo. */
const facts = computed<Fact[]>(() => {
  const current: Profile | null = person.value
  if (current === null) {
    return []
  }
  const list: Fact[] = []
  if (current.occupation) list.push({ icon: Briefcase, text: current.occupation })
  if (current.education) list.push({ icon: GraduationCap, text: current.education })
  if (current.hometown) list.push({ icon: House, text: 'From ' + current.hometown })
  if (current.languages) list.push({ icon: Languages, text: current.languages })
  if (current.pronouns) list.push({ icon: UserRound, text: current.pronouns })
  return list
})

/** "Brooklyn, NY · photo 1 of 5" - the parts of it that there are. */
const photoLine = computed<string>(() => {
  const current: Profile | null = person.value
  if (current === null) {
    return ''
  }
  const parts: string[] = []
  if (current.city) parts.push(current.city)
  if (current.photos.length > 1) parts.push('photo ' + (shown.value + 1) + ' of ' + current.photos.length)
  return parts.join(' · ')
})

onMounted(load)
watch(() => props.userId, load)

async function load(): Promise<void> {
  loading.value = true
  missing.value = false
  shown.value = 0
  relation.value = null
  coming.value = []
  void loadRelation()
  try {
    person.value = await api.profile(props.userId)
  } catch (caught) {
    person.value = null
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    } else {
      toastError(caught)
    }
  } finally {
    loading.value = false
  }
}

function step(by: number): void {
  const count: number = person.value?.photos.length ?? 0
  if (count > 0) {
    shown.value = (shown.value + by + count) % count
  }
}

/** The arrow keys turn the photos - unless the person is typing or holding a modifier. */
function onKey(event: KeyboardEvent): void {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return
  }
  const target = event.target as HTMLElement | null
  if (target !== null && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
    return
  }
  if (event.key === 'ArrowLeft') {
    step(-1)
  } else if (event.key === 'ArrowRight') {
    step(1)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// ------------------------------------------------------------------ friends

/**
 * Where the user stands with this person. The server has no single answer to that, so it is
 * worked out from the same three lists the Friends page shows.
 */
type Relation =
  | { kind: 'NONE' }
  | { kind: 'FRIEND' }
  | { kind: 'SENT' }
  | { kind: 'INCOMING'; requestId: number }

/** Null while unknown (loading, failed, or the user's own page): no friend action is shown then. */
const relation = ref<Relation | null>(null)
const relationBusy = ref<boolean>(false)

async function loadRelation(): Promise<void> {
  const userId: number = props.userId
  if (isMe.value) {
    return
  }
  try {
    const [friendList, incomingList, outgoingList] = await Promise.all([
      api.friends(),
      api.incomingFriendRequests(),
      api.outgoingFriendRequests(),
    ])
    // Another person was opened meanwhile: this answer is about the previous one.
    if (userId !== props.userId) {
      return
    }
    const incoming = incomingList.find((request) => request.userId === userId)
    if (friendList.some((friend) => friend.userId === userId)) {
      relation.value = { kind: 'FRIEND' }
    } else if (incoming !== undefined) {
      relation.value = { kind: 'INCOMING', requestId: incoming.requestId }
    } else if (outgoingList.some((request) => request.userId === userId)) {
      relation.value = { kind: 'SENT' }
    } else {
      relation.value = { kind: 'NONE' }
    }
  } catch (caught) {
    toastError(caught)
  }
}

async function addFriend(): Promise<void> {
  await changeRelation(async () => {
    await api.sendFriendRequest(props.userId)
    toastOk('Request sent to ' + (person.value?.displayName ?? 'them'))
  })
}

async function answer(requestId: number, accept: boolean): Promise<void> {
  await changeRelation(async () => {
    if (accept) {
      await api.acceptFriendRequest(requestId)
      toastOk('You and ' + (person.value?.displayName ?? 'they') + ' are friends now')
    } else {
      await api.declineFriendRequest(requestId)
      toastOk('Request declined')
    }
  })
}

/** Runs one change and asks the server where things stand now, whatever the outcome. */
async function changeRelation(action: () => Promise<void>): Promise<void> {
  relationBusy.value = true
  try {
    await action()
  } catch (caught) {
    toastError(caught)
  } finally {
    await loadRelation()
    relationBusy.value = false
  }
}

// ------------------------------------------------------------------ the days a friend marked

/** How far ahead the marks are shown: about what one plans for. */
const COMING_DAYS: number = 60

const KIND_LABEL: Record<AvailabilityKind, string> = { BUSY: 'Busy', FREE: 'Free', TRIP: 'Away' }

/** The friend's marks for the coming days, earliest first. Empty for anyone who is not a friend. */
const coming = ref<FriendAvailability[]>([])

// Friends see each other's marked days; the server gives nothing about anyone else, so it is
// asked only once the person is known to be a friend.
watch(
  () => relation.value?.kind,
  (kind) => {
    if (kind === 'FRIEND') {
      void loadComing()
    } else {
      coming.value = []
    }
  },
)

async function loadComing(): Promise<void> {
  const userId: number = props.userId
  // Days are plain dates in the user's own calendar: see lib/dates.ts.
  const from: string = today()
  try {
    const marks: FriendAvailability[] = await api.friendsAvailability(from, addDays(from, COMING_DAYS), userId)
    // Another person was opened meanwhile, or the friendship ended: the answer is not for this page.
    if (userId !== props.userId || relation.value?.kind !== 'FRIEND') {
      return
    }
    coming.value = [...marks].sort((a, b) => a.fromDate.localeCompare(b.fromDate))
  } catch (caught) {
    toastError(caught)
  }
}
</script>

<template>
  <div class="app-col app-col--wide">
    <div v-if="loading && person === null" class="person" aria-busy="true">
      <div class="person__viewer">
        <span class="hg-photo hg-photo--portrait hg-skel"></span>
      </div>
      <div class="person__story">
        <span class="hg-skel person__skel-title"></span>
        <span class="hg-skel hg-skel--line"></span>
        <span class="hg-skel hg-skel--line"></span>
        <span class="hg-skel person__skel-card"></span>
      </div>
    </div>

    <div v-else-if="missing" class="hg-empty" data-tst-id="person-missing">
      <UserX class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <h1 class="hg-empty__title">This person is not here.</h1>
    </div>

    <article v-else-if="person !== null" class="person" data-tst-id="person">
      <!-- ------------------------------------------------------------ photos -->
      <div class="person__viewer">
        <div class="hg-photo hg-photo--portrait">
          <img
            v-if="person.photos.length > 0"
            :src="serverFileUrl(person.photos[shown]?.url) ?? undefined"
            :alt="'Photo ' + (shown + 1) + ' of ' + person.photos.length + ' of ' + person.displayName"
            data-tst-id="person-photo"
          />
          <span v-else class="hg-photo__empty" aria-hidden="true">
            <span class="hg-photo__initials">{{ initials(person.displayName) }}</span>
          </span>

          <template v-if="person.photos.length > 1">
            <!-- Which photo of how many, as on a phone: a row of segments at the top. -->
            <div class="person__segments" aria-hidden="true">
              <span
                v-for="(photo, index) in person.photos"
                :key="photo.id"
                class="person__segment"
                :class="{ 'person__segment--on': index === shown }"
              ></span>
            </div>

            <!-- The left half of the photo turns back, the right half forward. -->
            <button
              class="person__step person__step--back"
              type="button"
              aria-label="Previous photo"
              @click="step(-1)"
            ></button>
            <button
              class="person__step person__step--next"
              type="button"
              aria-label="Next photo"
              data-tst-id="person-photo-next"
              @click="step(1)"
            ></button>
          </template>

          <!-- Without a photo there is nothing to shade: the name then stands on the plain tile. -->
          <div
            class="person__caption"
            :class="person.photos.length > 0 ? 'hg-photo__shade' : 'person__caption--plain'"
          >
            <h1 class="person__name">
              {{ person.displayName }}
              <span v-if="person.age !== null" class="person__age">{{ person.age }}</span>
            </h1>
            <p v-if="photoLine !== ''">{{ photoLine }}</p>
          </div>
        </div>
      </div>

      <!-- ------------------------------------------------------------ the story -->
      <div class="person__story">
        <div v-if="isMe || relation !== null || person.privilege !== 'STANDARD'" class="person__actions">
          <RouterLink v-if="isMe" class="hg-btn hg-btn--outline" :to="{ name: 'profile' }" data-tst-id="person-edit">
            <Pencil class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <span>Edit my profile</span>
          </RouterLink>

          <template v-else-if="relation !== null">
            <button
              v-if="relation.kind === 'NONE'"
              class="hg-btn hg-btn--primary person__main-action"
              :class="{ 'is-loading': relationBusy }"
              type="button"
              :disabled="relationBusy"
              data-tst-id="person-friend-add"
              @click="addFriend"
            >
              <UserPlus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Add friend</span>
            </button>

            <button
              v-else-if="relation.kind === 'SENT'"
              class="hg-btn hg-btn--outline"
              type="button"
              disabled
              data-tst-id="person-friend-sent"
            >
              <Check class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Request sent</span>
            </button>

            <template v-else-if="relation.kind === 'INCOMING'">
              <button
                class="hg-btn hg-btn--primary person__main-action"
                :class="{ 'is-loading': relationBusy }"
                type="button"
                :disabled="relationBusy"
                data-tst-id="person-friend-accept"
                @click="answer(relation.requestId, true)"
              >
                <span>Accept</span>
              </button>
              <button
                class="hg-btn hg-btn--outline"
                type="button"
                :disabled="relationBusy"
                data-tst-id="person-friend-decline"
                @click="answer(relation.requestId, false)"
              >
                <span>Decline</span>
              </button>
            </template>

            <span v-else class="hg-badge hg-badge--success" data-tst-id="person-friend">
              <UserCheck class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              Friends
            </span>
          </template>

          <span v-if="person.privilege !== 'STANDARD'" class="hg-badge" data-tst-id="person-privilege">
            {{ person.privilege === 'MAX' ? 'Max' : person.privilege === 'PRO' ? 'Pro' : 'Plus' }}
          </span>
        </div>

        <!-- How much their "I'm coming" is worth. Nothing while there is too little to judge by. -->
        <div
          v-if="person.reliability.score !== null"
          class="person__reliability"
          data-tst-id="person-reliability"
        >
          <ReliabilityBadge :score="person.reliability.score" />
          <span class="person__reliability-text hg-num">
            Kept {{ person.reliability.kept }} of {{ person.reliability.kept + person.reliability.broken }} promises
          </span>
        </div>

        <!-- For a friend: the days they marked, to see at once when not to invite them. -->
        <section v-if="coming.length > 0" data-tst-id="person-availability">
          <h2 class="person__title">Coming days</h2>
          <ul class="person__coming">
            <li v-for="(mark, index) in coming" :key="index" class="person__mark" data-tst-id="person-mark">
              <span
                class="hg-badge"
                :class="{ 'hg-badge--success': mark.kind === 'FREE', 'hg-badge--warning': mark.kind !== 'FREE' }"
              >
                {{ KIND_LABEL[mark.kind] }}
              </span>
              <span class="hg-num">{{ dayRange(mark.fromDate, mark.toDate) }}</span>
              <span v-if="mark.kind === 'TRIP' && mark.city" class="hg-soft">
                {{ availabilityPhrase(mark.kind, mark.city) }}
              </span>
            </li>
          </ul>
        </section>

        <section v-if="person.bio">
          <h2 class="person__title">About</h2>
          <p class="person__bio">{{ person.bio }}</p>
        </section>

        <section v-if="facts.length > 0">
          <h2 class="person__title">Facts</h2>
          <ul class="hg-plan__facts person__facts">
            <li v-for="fact in facts" :key="fact.text" class="hg-plan__fact">
              <component :is="fact.icon" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span class="person__fact-text">{{ fact.text }}</span>
            </li>
          </ul>
        </section>

        <section v-if="person.interests.length > 0" data-tst-id="person-interests">
          <h2 class="person__title">Interests</h2>
          <ul class="person__interests">
            <li v-for="interest in person.interests" :key="interest" class="hg-chip person__interest">
              {{ interest }}
            </li>
          </ul>
        </section>

        <div
          v-for="prompt in person.prompts"
          :key="prompt.question"
          class="hg-card hg-card--lg"
          data-tst-id="person-prompt"
        >
          <p class="person__question">{{ prompt.question }}</p>
          <p class="person__answer">{{ prompt.answer }}</p>
        </div>

        <p
          v-if="!person.bio && facts.length === 0 && person.interests.length === 0 && person.prompts.length === 0"
          class="hg-soft"
        >
          {{ isMe ? 'You have not said anything about yourself yet.' : 'Has not said anything about themselves yet.' }}
        </p>
      </div>
    </article>
  </div>
</template>

<style scoped>
/* Two columns from 1024px: the photo stays in sight while the story scrolls. Narrower - the photo
   at the top, the story under it. */
.person {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr); /* the width of the photo in the design */
  gap: var(--s-7);
  align-items: start;
}

/* ---------------------------------------------------------------- photos */

.person__viewer {
  position: sticky;
  top: var(--s-6);
  min-width: 0;
}

.person__segments {
  position: absolute;
  top: var(--s-3);
  right: var(--s-3);
  left: var(--s-3);
  display: flex;
  gap: var(--s-1);
}

.person__segment {
  flex: 1;
  height: 3px;
  border-radius: var(--r-full);
  background: var(--c-on-accent);
  opacity: 0.4;
  transition: opacity var(--dur-2) var(--ease);
}

.person__segment--on {
  opacity: 1;
}

.person__step {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  padding: 0;
  border: 0;
  background: transparent;
}

/* The outline of the page would be cut by the rounded tile: draw it inside. */
.person__step:focus-visible {
  outline-offset: calc(var(--s-1) * -1);
  border-radius: var(--r-l);
}

.person__step--back {
  left: 0;
  cursor: w-resize;
}

.person__step--next {
  right: 0;
  cursor: e-resize;
}

/* Clicks go through the caption to the two halves under it. */
.person__caption {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-1);
  padding: var(--s-8) var(--s-5) var(--s-5);
  pointer-events: none;
}

.person__caption--plain {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  padding-top: 0;
  color: var(--c-ink);
}

.person__name {
  font: var(--t-display);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.person__age {
  font-weight: 400;
}

/* ---------------------------------------------------------------- the story */

.person__story {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  min-width: 0;
  padding-top: var(--s-2);
}

.person__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.person__reliability {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

/* Under the actions it belongs to them: closer than one section is to the next. */
.person__actions + .person__reliability {
  margin-top: calc(var(--s-5) * -1);
}

.person__reliability-text {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.person__coming {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.person__mark {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.person__title {
  margin-bottom: var(--s-2);
  font: var(--t-title-3);
}

.person__bio {
  max-width: 65ch;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.person__facts {
  gap: var(--s-2);
}

.person__fact-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.person__interests {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: var(--s-3);
}

/* A chip here says something, it is not pressed. */
.person__interest {
  cursor: default;
}

.person__interest:hover {
  background: var(--c-surface-strong);
}

.person__question {
  margin-bottom: var(--s-2);
  font: var(--t-small);
  color: var(--c-ink-soft);
}

.person__answer {
  font: var(--t-title-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ---------------------------------------------------------------- loading */

.person__skel-title {
  width: 50%;
  height: var(--s-6);
}

.person__skel-card {
  height: calc(var(--s-8) * 2);
}

/* ---------------------------------------------------------------- narrower windows */

@media (max-width: 1023px) {
  .person {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s-5);
  }

  /* Full width on a phone; on a tablet no larger than in the design. */
  .person__viewer {
    position: static;
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }

  .person__story {
    padding-top: 0;
  }
}

@media (max-width: 767px) {
  .person__main-action {
    flex: 1 1 100%;
  }
}
</style>
