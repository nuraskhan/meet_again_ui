<script setup lang="ts">
// Home of a logged-in user: invitations waiting for an answer, then every plan they are part of -
// what is coming up as cards, what is over or called off behind a row that folds.

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, CalendarDays, Clock, Globe, MapPin, Plus } from 'lucide-vue-next'
import { onSignal } from '@/stores/signal'
import { api } from '@/api'
import type { EventDto, Invitation, Invitee } from '@/api/types'
import EventPicture from '@/components/EventPicture.vue'
import EventSummary from '@/components/EventSummary.vue'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { EVENT_TYPE_LOOK, proposedTimesSummary } from '@/lib/format'
import { nextStep, planSteps, wasLinkSent } from '@/lib/planSteps'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const router = useRouter()

/** How many cards the skeleton shows while the lists are on their way. */
const SKELETONS: number = 4
/** A card shows this many faces at most; the count next to them says the rest. */
const FACES: number = 4

const invitations = ref<Invitation[]>([])
const events = ref<EventDto[]>([])
const loading = ref<boolean>(true)
/** The invitation being answered right now, to disable its buttons. */
const answering = ref<number | null>(null)
/** The answer being sent is "I'm coming": tells which of the two buttons shows the spinner. */
const accepting = ref<boolean>(false)
/** The past plans are unfolded. */
const closedOpen = ref<boolean>(true)

// An unanswered invitation is shown at the top; the same event is not repeated in the list below.
const plans = computed<EventDto[]>(() => {
  const waiting = new Set<number>(invitations.value.map((invitation) => invitation.event.id))
  return events.value.filter((event) => !waiting.has(event.id))
})

/** Still on: what the page is mostly about. */
const upcoming = computed<EventDto[]>(() => plans.value.filter((event) => event.status === 'ACTIVE'))

/** Over or called off: kept below, out of the way. */
const closed = computed<EventDto[]>(() => plans.value.filter((event) => event.status !== 'ACTIVE'))

onMounted(load)

// An invitation, an answer, a cancellation: whatever it was, the lists here may have changed.
const stopListening: () => void = onSignal('notification', () => void load())
onBeforeUnmount(stopListening)

async function load(): Promise<void> {
  try {
    const [incoming, all] = await Promise.all([api.incomingInvitations(), api.events()])
    invitations.value = incoming
    events.value = all
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
}

async function answer(invitation: Invitation, accept: boolean): Promise<void> {
  answering.value = invitation.invitationId
  accepting.value = accept
  try {
    if (accept) {
      await api.acceptInvitation(invitation.invitationId)
      toastOk('You are coming. Now say where you are coming from.')
      // The plan page asks for the guest's location and travel distance.
      await router.push({ name: 'plan', params: { eventId: invitation.event.id } })
      return
    } else {
      await api.declineInvitation(invitation.invitationId)
      toastOk('Declined. Maybe next time.')
    }
    await load()
  } catch (caught) {
    toastError(caught)
  } finally {
    answering.value = null
  }
}

/** The guests who said yes, in the order the server gives them. */
function coming(event: EventDto): Invitee[] {
  return event.invitees.filter((invitee) => invitee.status === 'ACCEPTED')
}

/** "2 of 3 coming"; for a plan that is over, "2 came". */
function crowd(event: EventDto): string {
  const going: number = coming(event).length
  if (event.status === 'EXPIRED') {
    return going + ' came'
  }
  return going + ' of ' + event.invitees.length + ' coming'
}

/** What this person should do in the plan now ("Invite people"); null = nothing is waiting for them. */
function next(event: EventDto): string | null {
  const step = nextStep(planSteps(event, auth.state.userId, wasLinkSent(event.id)))
  // Waiting for the organiser is not this person's move: nothing to point at.
  return step === null || step.waiting ? null : step.title
}

/** What happened to the plan or what the current user answered; null = nothing worth a badge. */
function standing(event: EventDto): { text: string; kind: string } | null {
  if (event.status === 'CANCELLED') {
    return { text: 'Cancelled', kind: '' }
  }
  if (event.status === 'EXPIRED') {
    return { text: 'Over', kind: '' }
  }

  const mine: Invitee | undefined = event.invitees.find((invitee) => invitee.userId === auth.state.userId)
  if (mine?.status === 'DECLINED') {
    return { text: 'You declined', kind: 'hg-badge--danger' }
  }
  return null
}
</script>

<template>
  <div class="app-col">
    <div class="app-head">
      <h1 class="app-head__title">Plans</h1>
      <RouterLink class="hg-btn hg-btn--neutral plans__new" :to="{ name: 'plan-new' }" data-tst-id="plans-new">
        <Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span>New plan</span>
      </RouterLink>
    </div>

    <!-- ------------------------------------------------------------ loading: the shape of the cards -->
    <div v-if="loading" aria-busy="true">
      <span class="hg-sr">Loading your plans</span>
      <span class="hg-skel plans__skel-heading" aria-hidden="true"></span>
      <div class="plans__grid" aria-hidden="true">
        <div v-for="index in SKELETONS" :key="index" class="hg-card plans__card">
          <span class="hg-skel hg-skel--line plans__skel-kind"></span>
          <span class="hg-skel plans__skel-title"></span>
          <span class="hg-skel hg-skel--line plans__skel-when"></span>
          <span class="plans__crowd">
            <span class="hg-skel hg-skel--circle plans__skel-face"></span>
            <span class="hg-skel hg-skel--line plans__skel-count"></span>
          </span>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- ---------------------------------------------------------- invitations -->
      <section v-if="invitations.length > 0" class="app-section" data-tst-id="plans-invitations">
        <h2 class="plans__heading">
          Waiting for your answer <span class="hg-soft hg-num">{{ invitations.length }}</span>
        </h2>

        <div class="app-stack">
          <article
            v-for="invitation in invitations"
            :key="invitation.invitationId"
            class="hg-card hg-card--accent plans__invitation"
            data-tst-id="invitation"
          >
            <UserAvatar :name="invitation.event.creatorName" :user-id="invitation.event.creatorId" :size="40" />

            <div class="plans__invitation-body">
              <p class="plans__from">
                <b>{{ invitation.event.creatorName }}</b> invites you
              </p>
              <RouterLink
                class="plans__invitation-link"
                :to="{ name: 'plan', params: { eventId: invitation.event.id } }"
              >
                <!-- The default picture of the activity: venues have no photos of their own yet. -->
                <span class="plans__thumb">
                  <EventPicture :type="invitation.event.eventType" />
                </span>
                <EventSummary class="plans__invitation-summary" :event="invitation.event" />
              </RouterLink>
              <span v-if="invitation.event.place !== null" class="plans__place" data-tst-id="plan-card-place">
                <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <span>{{ invitation.event.place.name }}</span>
              </span>
            </div>

            <div class="plans__answers">
              <button
                class="hg-btn hg-btn--primary"
                :class="{ 'is-loading': answering === invitation.invitationId && accepting }"
                type="button"
                :disabled="answering === invitation.invitationId"
                data-tst-id="invitation-accept"
                @click="answer(invitation, true)"
              >
                <span>I'm coming</span>
              </button>
              <button
                class="hg-btn hg-btn--outline"
                :class="{ 'is-loading': answering === invitation.invitationId && !accepting }"
                type="button"
                :disabled="answering === invitation.invitationId"
                data-tst-id="invitation-decline"
                @click="answer(invitation, false)"
              >
                <span>I can't</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- ---------------------------------------------------------- what is coming up -->
      <section v-if="upcoming.length > 0" class="app-section">
        <h2 class="plans__heading">Upcoming</h2>

        <div class="plans__grid">
          <RouterLink
            v-for="event in upcoming"
            :key="event.id"
            class="hg-card hg-card--link plans__card"
            :to="{ name: 'plan', params: { eventId: event.id } }"
            data-tst-id="plan-card"
          >
            <div class="plans__card-top">
              <span class="hg-plan__kind">
                <EventTypeIcon :type="event.eventType" :size="16" />
                {{ EVENT_TYPE_LOOK[event.eventType].label }}
              </span>
              <span class="plans__badges">
                <span v-if="event.visibility === 'PUBLIC'" class="hg-badge">
                  <Globe class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  Public
                </span>
                <span v-if="event.creatorId === auth.state.userId" class="hg-badge">You organise</span>
                <span v-if="standing(event) !== null" class="hg-badge" :class="standing(event)?.kind">
                  {{ standing(event)?.text }}
                </span>
              </span>
            </div>

            <div class="plans__card-main">
              <!-- The default picture of the activity: venues have no photos of their own yet. -->
              <span class="plans__thumb">
                <EventPicture :type="event.eventType" />
              </span>

              <div class="plans__card-text">
                <h3 class="hg-plan__title">{{ event.title }}</h3>

                <span class="hg-plan__fact plans__when" data-tst-id="summary-when">
                  <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  {{ proposedTimesSummary(event.proposedTimes) }}
                </span>

                <span v-if="event.place !== null" class="plans__place" data-tst-id="plan-card-place">
                  <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  <span>{{ event.place.name }}</span>
                </span>
              </div>
            </div>

            <div class="plans__crowd">
              <span v-if="coming(event).length > 0" class="hg-stack">
                <UserAvatar
                  v-for="invitee in coming(event).slice(0, FACES)"
                  :key="invitee.userId"
                  :name="invitee.displayName"
                  :user-id="invitee.userId"
                  :size="32"
                />
              </span>
              <span class="plans__count hg-num">{{ crowd(event) }}</span>
            </div>

            <!-- The one thing waiting for this person in the plan. -->
            <span v-if="next(event) !== null" class="plans__next" data-tst-id="plan-card-next">
              <ArrowRight class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Next: {{ next(event) }}</span>
            </span>
          </RouterLink>
        </div>
      </section>

      <div v-else-if="invitations.length === 0" class="hg-empty plans__empty" data-tst-id="plans-empty">
        <CalendarDays class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <h2 class="hg-empty__title">{{ closed.length > 0 ? 'Nothing coming up' : 'No plans yet' }}</h2>
        <p class="hg-empty__text">
          {{
            closed.length > 0
              ? 'When you make a plan or someone invites you, it appears here.'
              : 'Invite your friends to the first one. It takes a minute.'
          }}
        </p>
        <RouterLink class="hg-btn hg-btn--primary plans__start" :to="{ name: 'plan-new' }">
          <span>New plan</span>
        </RouterLink>
      </div>

      <!-- What is over or was called off: still there to look at, out of the way. -->
      <section v-if="closed.length > 0" data-tst-id="plans-closed">
        <button
          class="hg-row hg-row--link plans__toggle"
          type="button"
          :aria-expanded="closedOpen"
          aria-controls="plans-closed-list"
          data-tst-id="plans-closed-toggle"
          @click="closedOpen = !closedOpen"
        >
          <span class="hg-iconcircle">
            <CalendarDays class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </span>
          <span class="hg-row__text plans__toggle-text">
            <span class="hg-row__title">Past plans ({{ closed.length }})</span>
            <span class="hg-row__sub">{{ closedOpen ? 'Hide' : 'Show' }}</span>
          </span>
        </button>

        <div v-show="closedOpen" id="plans-closed-list" class="plans__grid plans__grid--closed">
          <RouterLink
            v-for="event in closed"
            :key="event.id"
            class="hg-card hg-card--link hg-card--quiet plans__card plans__card--quiet"
            :to="{ name: 'plan', params: { eventId: event.id } }"
            data-tst-id="plan-card-closed"
          >
            <div class="plans__card-top">
              <span class="hg-plan__kind">
                <EventTypeIcon :type="event.eventType" :size="16" />
                {{ EVENT_TYPE_LOOK[event.eventType].label }}
              </span>
              <span class="plans__badges">
                <span v-if="standing(event) !== null" class="hg-badge" :class="standing(event)?.kind">
                  {{ standing(event)?.text }}
                </span>
              </span>
            </div>

            <div class="plans__card-main">
              <!-- The default picture of the activity: venues have no photos of their own yet. -->
              <span class="plans__thumb">
                <EventPicture :type="event.eventType" />
              </span>

              <div class="plans__card-text">
                <h3 class="hg-plan__title">{{ event.title }}</h3>

                <span class="hg-plan__fact plans__when" data-tst-id="summary-when">
                  <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  {{ proposedTimesSummary(event.proposedTimes) }}
                </span>

                <span v-if="event.place !== null" class="plans__place" data-tst-id="plan-card-place">
                  <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                  <span>{{ event.place.name }}</span>
                </span>
              </div>
            </div>

            <div class="plans__crowd">
              <span v-if="coming(event).length > 0" class="hg-stack">
                <UserAvatar
                  v-for="invitee in coming(event).slice(0, FACES)"
                  :key="invitee.userId"
                  :name="invitee.displayName"
                  :user-id="invitee.userId"
                  :size="32"
                />
              </span>
              <span class="plans__count hg-num">{{ crowd(event) }}</span>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* "Next: invite people" at the foot of a card: the accent says it is this person's move. */
.plans__next {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  color: var(--c-accent-text);
  font: var(--t-body-strong);
}

.plans__next .hg-icon {
  flex: none;
  width: var(--s-4);
  height: var(--s-4);
}

/* main.css colours every link, and every hovered link, as a text link: the links that are buttons
 * or cards keep their own colours. */
.plans__new:hover {
  color: var(--c-on-ink);
}

.plans__start:hover {
  color: var(--c-on-accent);
}

.plans__heading {
  margin-bottom: var(--s-4);
  font: var(--t-title-2);
}

/* ---- an invitation: who, what, and the two answers ---- */
.plans__invitation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-4);
}

.plans__invitation-body {
  display: flex;
  flex: 1 1 320px;
  flex-direction: column;
  gap: var(--s-2);
  min-width: 0;
}

.plans__from {
  overflow-wrap: anywhere;
}

.plans__invitation-link,
.plans__invitation-link:hover {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  color: var(--c-ink);
}

.plans__invitation-summary {
  flex: 1;
  min-width: 0;
}

.plans__answers {
  display: flex;
  gap: var(--s-2);
}

/* ---- a plan card ---- */
.plans__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  gap: var(--s-4);
}

.plans__grid--closed {
  margin-top: var(--s-4);
}

.plans__card {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}

.plans__card,
.plans__card:hover {
  color: var(--c-ink);
}

.plans__card--quiet,
.plans__card--quiet:hover {
  color: var(--c-ink-soft);
}

/* The picture and, beside it, what the plan is. */
.plans__card-main {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
}

.plans__card-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--s-2);
  min-width: 0;
}

/* The small picture of a plan: 3:2, the drawing fills it and is cut at the rounded corners. */
.plans__thumb {
  display: block;
  flex: none;
  width: 96px;
  aspect-ratio: 3 / 2;
  border-radius: var(--r-s);
  overflow: hidden;
}

/* A plan that is over is told apart at a glance: its picture fades with the rest of the card. */
.plans__card--quiet .plans__thumb {
  opacity: 0.6;
}

.plans__place {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
  color: var(--c-ink-soft);
  font: var(--t-small);
  overflow-wrap: anywhere;
}

.plans__place .hg-icon {
  flex: none;
  width: 16px;
  height: 16px;
}

.plans__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
}

.plans__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--s-1);
}

.plans__when {
  color: var(--c-ink-soft);
  font: var(--t-small);
  font-variant-numeric: tabular-nums;
}

/* The bottom line stays at the bottom when a neighbour's title takes two lines. */
.plans__crowd {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-height: var(--size-control-sm);
  margin-top: auto;
}

.plans__count {
  font: var(--t-small);
  font-variant-numeric: tabular-nums;
}

/* ---- the row that folds the past plans: a button dressed as a list row ---- */
.plans__toggle {
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: var(--r-m);
  font: inherit;
  color: inherit;
  text-align: left;
}

.plans__toggle:not(:hover):not(:active) {
  background: none;
}

.plans__toggle-text {
  border-bottom: 0;
}

.plans__empty {
  margin-bottom: var(--s-6);
}

/* ---- skeleton: the cards before they have come ---- */
.plans__skel-heading {
  width: 160px;
  height: var(--s-5);
  margin-bottom: var(--s-4);
}

.plans__skel-kind {
  width: 30%;
}

.plans__skel-title {
  width: 80%;
  height: var(--s-5);
}

.plans__skel-when {
  width: 50%;
}

.plans__skel-face {
  width: var(--size-control-sm);
  height: var(--size-control-sm);
}

.plans__skel-count {
  width: var(--s-8);
}

@media (max-width: 767px) {
  .plans__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* The two answers go under the invitation, sharing its width. */
  .plans__invitation-body {
    flex-basis: calc(100% - var(--size-control) - var(--s-4));
  }

  .plans__answers {
    width: 100%;
  }

  .plans__answers .hg-btn {
    flex: 1;
  }

  .plans__new {
    width: 100%;
  }
}

/* A narrow phone: the picture gives way to the title. */
@media (max-width: 399px) {
  .plans__thumb {
    width: 64px;
  }
}
</style>
