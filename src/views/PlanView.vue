<script setup lang="ts">
// One plan: the invitation, who answered what, the way into its chat.
// Two columns: what the plan is, where to go and the viewer's own location on the left; the chat,
// the link and the people in a rail on the right (under the rest on a narrow screen).

import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { CalendarX, ChevronLeft, Globe, MessageCircle, X } from 'lucide-vue-next'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { AppNotification, EventDto, Invitee, Preference } from '@/api/types'
import { onSignal } from '@/stores/signal'
import EventSummary from '@/components/EventSummary.vue'
import PreferenceForm from '@/components/PreferenceForm.vue'
import SuggestedPlaces from '@/components/SuggestedPlaces.vue'
import ProposedTimes from '@/components/ProposedTimes.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { inviteLink } from '@/lib/format'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const props = defineProps<{ eventId: number }>()

const event = ref<EventDto | null>(null)
const loading = ref<boolean>(true)
const missing = ref<boolean>(false)
const busy = ref<boolean>(false)
/** Which of the two answer buttons was pressed: that one shows the spinner. */
const answering = ref<'accept' | 'decline' | null>(null)
/** A guest pressed "I can't come after all" once and is asked to confirm. */
const confirmingLeave = ref<boolean>(false)
/** The guest the creator is about to remove (their user id), waiting for a confirmation. */
const removing = ref<number | null>(null)
/** The creator pressed "Cancel plan" once and is asked to confirm. */
const confirmingCancel = ref<boolean>(false)

const isCreator = computed<boolean>(() => event.value?.creatorId === auth.state.userId)
const active = computed<boolean>(() => event.value?.status === 'ACTIVE')

/** The current user's own invitation, if they are an invitee. */
const mine = computed<Invitee | undefined>(() =>
  event.value?.invitees.find((invitee) => invitee.userId === auth.state.userId),
)

/**
 * The creator and a guest who has not declined say where they are and how far they travel: a place
 * is suggested from where everyone is coming from.
 */
const canSetPreference = computed<boolean>(
  () => active.value && (isCreator.value || (mine.value !== undefined && mine.value.status !== 'DECLINED')),
)

/** "Up to 5 mi from Brooklyn"; without a typed place only the distance is known to the others. */
function preferenceLine(place: string | null, shared: boolean, radiusMi: number | null): string {
  if (radiusMi !== null) {
    if (place !== null) {
      return 'Up to ' + radiusMi + ' mi from ' + place
    }
    return shared ? 'Up to ' + radiusMi + ' mi · location shared' : 'Up to ' + radiusMi + ' mi'
  }
  if (place !== null) {
    return 'From ' + place
  }
  return shared ? 'Location shared' : ''
}

/** What the others may know about a guest's preference: "Up to 5 mi from Brooklyn". */
function guestPreference(invitee: Invitee): string {
  return preferenceLine(invitee.locationText, invitee.locationShared, invitee.travelRadiusMi)
}

/** A guest who is expected (coming or not answered) and has said nothing about where from. */
function preferenceAwaited(invitee: Invitee): boolean {
  return (
    active.value &&
    (invitee.status === 'ACCEPTED' || invitee.status === 'PENDING') &&
    guestPreference(invitee) === ''
  )
}

/**
 * The small line under the organiser's name. The server tells a guest nothing about where the
 * organiser is coming from, so the preference is added only for the organiser's own eyes.
 */
const organiserLine = computed<string>(() => {
  const own: Preference | null = isCreator.value ? (event.value?.myPreference ?? null) : null
  if (own === null) {
    return 'Organiser'
  }
  const coordinates: boolean = own.latitude !== null && own.longitude !== null
  const line: string = preferenceLine(own.locationText, coordinates, own.travelRadiusMi)
  // Mid-sentence now: "Organiser · up to 5 mi from Brooklyn" (the name of the place keeps its capital).
  return 'Organiser · ' + line.charAt(0).toLowerCase() + line.slice(1)
})

/**
 * "4 coming · 2 not answered · 1 declined". The organiser is not among the invitees and is always
 * coming; a count of nobody is left out.
 */
const peopleCounts = computed<string>(() => {
  const invitees: Invitee[] = event.value?.invitees ?? []
  const count = (status: Invitee['status']): number =>
    invitees.filter((invitee) => invitee.status === status).length
  const pending: number = count('PENDING')
  const declined: number = count('DECLINED')
  const parts: string[] = [count('ACCEPTED') + 1 + ' coming']
  if (pending > 0) {
    parts.push(pending + ' not answered')
  }
  if (declined > 0) {
    parts.push(declined + ' declined')
  }
  return parts.join(' · ')
})

/** Ties the label of the share link to its field. */
const linkId: string = useId()

/** The address to send to people; empty for everyone but the creator. */
const link = computed<string>(() => {
  const token: string | null | undefined = event.value?.shareToken
  return token ? inviteLink(token) : ''
})

const copied = ref<boolean>(false)

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // No clipboard access (an insecure page, or the permission is denied): the field is selectable.
    toastOk('Select the link and copy it by hand.')
  }
}

/** Someone who declined is no longer in the chat. */
const inChat = computed<boolean>(() => isCreator.value || mine.value?.status !== 'DECLINED')

onMounted(load)
watch(() => props.eventId, load)

// Someone answered, joined, left, or the plan was called off: read it again, quietly - without
// the skeleton that a first load shows, and without a complaint if it fails.
const stopListening: () => void = onSignal<AppNotification>('notification', async (notification) => {
  if (notification.eventId !== props.eventId || event.value === null) {
    return
  }
  try {
    event.value = await api.event(props.eventId)
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    }
  }
})
onBeforeUnmount(stopListening)

async function load(): Promise<void> {
  loading.value = true
  missing.value = false
  try {
    event.value = await api.event(props.eventId)
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    } else {
      toastError(caught)
    }
  } finally {
    loading.value = false
  }
}

async function answer(accept: boolean): Promise<void> {
  if (mine.value === undefined) {
    return
  }
  busy.value = true
  answering.value = accept ? 'accept' : 'decline'
  try {
    if (accept) {
      await api.acceptInvitation(mine.value.invitationId)
      toastOk('You are coming.')
    } else {
      await api.declineInvitation(mine.value.invitationId)
      toastOk('Declined. Maybe next time.')
    }
    await load()
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
    answering.value = null
  }
}

async function cancel(): Promise<void> {
  busy.value = true
  try {
    await api.cancelEvent(props.eventId)
    toastOk('The plan is cancelled')
    confirmingCancel.value = false
    await load()
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}

/** A guest who is coming changes their mind. They leave the chat too, and may join again. */
async function leave(): Promise<void> {
  busy.value = true
  try {
    await api.leaveEvent(props.eventId)
    toastOk('You left the plan')
    confirmingLeave.value = false
    await load()
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}

/** The creator takes a guest out of the plan and its chat. That person cannot join again. */
async function removeGuest(invitee: Invitee): Promise<void> {
  busy.value = true
  try {
    event.value = await api.removeGuest(props.eventId, invitee.userId)
    toastOk(invitee.displayName + ' was removed')
    removing.value = null
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}

/** The badge of a guest. "Declined" and "Removed" are plain facts: neutral, as the designers drew them. */
const STATUS_LOOK: Record<Invitee['status'], { text: string; kind: string }> = {
  ACCEPTED: { text: 'Coming', kind: 'hg-badge--success' },
  DECLINED: { text: 'Declined', kind: '' },
  PENDING: { text: 'Not answered', kind: 'hg-badge--warning' },
  REMOVED: { text: 'Removed', kind: '' },
}
</script>

<template>
  <div class="app-col app-col--rail">
    <!-- A first load: the shapes of both columns. -->
    <div v-if="loading && event === null" class="plan__layout" aria-busy="true" aria-label="Loading the plan">
      <div class="plan__main">
        <div class="plan__header">
          <span class="hg-skel hg-skel--line plan__skel--back"></span>
          <span class="hg-skel plan__skel--title"></span>
          <span class="hg-skel hg-skel--line plan__skel--half"></span>
        </div>
        <div class="plan__summary">
          <span class="hg-skel hg-skel--line"></span>
          <span class="hg-skel hg-skel--line plan__skel--most"></span>
          <span class="hg-skel hg-skel--line plan__skel--half"></span>
        </div>
        <span class="hg-skel plan__skel--block"></span>
      </div>
      <div class="plan__rail">
        <span class="hg-skel plan__skel--button"></span>
        <div class="plan__skel-people">
          <div v-for="row in 4" :key="row" class="plan__skel-person">
            <span class="hg-skel hg-skel--circle plan__skel--avatar"></span>
            <span class="hg-skel hg-skel--line plan__skel--name"></span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="missing" class="hg-empty" data-tst-id="plan-missing">
      <CalendarX class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <h1 class="hg-empty__title">Plan not found</h1>
      <p class="hg-empty__text">This plan does not exist, or you are not part of it.</p>
      <RouterLink class="hg-btn hg-btn--primary" :to="{ name: 'plans' }">My plans</RouterLink>
    </div>

    <div v-else-if="event !== null" class="plan__layout" data-tst-id="plan">
      <!-- ============================================================ the main column -->
      <div class="plan__main">
        <header class="plan__header">
          <RouterLink class="plan__back" :to="{ name: 'plans' }">
            <ChevronLeft class="hg-icon" :stroke-width="1.5" aria-hidden="true" />Plans
          </RouterLink>

          <div v-if="event.visibility === 'PUBLIC' || !active" class="plan__badges">
            <span v-if="event.visibility === 'PUBLIC'" class="hg-badge" data-tst-id="plan-public">
              <Globe class="hg-icon" :stroke-width="1.5" aria-hidden="true" />Public
            </span>
            <!-- "Over" is a plain fact; "cancelled" is shown as a warning. -->
            <span
              v-if="!active"
              class="hg-badge"
              :class="{ 'hg-badge--danger': event.status === 'CANCELLED' }"
              data-tst-id="plan-closed"
            >
              {{ event.status === 'EXPIRED' ? 'Over' : 'Cancelled' }}
            </span>
          </div>

          <EventSummary :event="event" variant="full" />

          <span v-if="isCreator" class="plan__by">
            <UserAvatar :name="event.creatorName" :user-id="event.creatorId" :size="24" />
            <span>Organised by <b>you</b></span>
          </span>
          <RouterLink v-else class="plan__by" :to="{ name: 'person', params: { userId: event.creatorId } }">
            <UserAvatar :name="event.creatorName" :user-id="event.creatorId" :size="24" />
            <span>Organised by <b>{{ event.creatorName }}</b></span>
          </RouterLink>
        </header>

        <!-- The invitee has not answered: the two buttons are the whole point of the page. -->
        <div v-if="active && mine?.status === 'PENDING'" class="hg-card hg-card--accent plan__answer">
          <p class="plan__answer-q">Are you coming?</p>
          <div class="plan__answer-actions">
            <button
              class="hg-btn hg-btn--primary"
              :class="{ 'is-loading': answering === 'accept' }"
              type="button"
              :disabled="busy"
              data-tst-id="plan-accept"
              @click="answer(true)"
            >
              <span>I'm coming</span>
            </button>
            <button
              class="hg-btn hg-btn--outline"
              :class="{ 'is-loading': answering === 'decline' }"
              type="button"
              :disabled="busy"
              data-tst-id="plan-decline"
              @click="answer(false)"
            >
              <span>I can't</span>
            </button>
          </div>
        </div>

        <section v-if="event.description || event.proposedTimes.length > 1" class="plan__summary">
          <p v-if="event.description" class="plan__note">{{ event.description }}</p>
          <ProposedTimes :times="event.proposedTimes" />
        </section>

        <SuggestedPlaces :event="event" :can-ask="canSetPreference" @updated="event = $event" />

        <!-- Everyone coming says where they are and how far they travel; places are suggested from it. -->
        <section v-if="canSetPreference" data-tst-id="plan-preference">
          <h2 class="plan__title">Your location and distance</h2>
          <p v-if="event.myPreference === null" class="plan__todo" data-tst-id="plan-preference-todo">
            Tell the others where you are coming from and how far you can go.
          </p>
          <PreferenceForm :event-id="event.id" :current="event.myPreference" @saved="event = $event" />
        </section>
      </div>

      <!-- ============================================================ the rail -->
      <aside class="plan__rail">
        <RouterLink
          v-if="inChat"
          class="hg-btn hg-btn--neutral hg-btn--block"
          :to="{ name: 'chat', params: { chatId: event.chatId } }"
          data-tst-id="plan-open-chat"
        >
          <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span>Open the chat</span>
        </RouterLink>
        <p v-else class="hg-card hg-card--quiet">You are not coming, so you are not in the chat of this plan.</p>

        <!-- The link: only the creator gets it from the server. -->
        <section v-if="link !== '' && active" data-tst-id="plan-share">
          <h2 class="plan__rail-title">Invite</h2>
          <div class="hg-field">
            <label class="hg-field__label" :for="linkId">Share link</label>
            <div class="plan__share">
              <input
                :id="linkId"
                class="hg-input"
                type="text"
                readonly
                :value="link"
                data-tst-id="plan-share-link"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <button class="hg-btn hg-btn--outline" type="button" data-tst-id="plan-share-copy" @click="copyLink">
                {{ copied ? 'Copied' : 'Copy' }}
              </button>
            </div>
            <p class="hg-field__msg">
              Anyone with this link can see the invitation. To accept it they log in or register.
            </p>
          </div>
        </section>

        <section>
          <h2 class="plan__rail-title plan__rail-title--tight">People</h2>
          <p class="plan__counts hg-num" data-tst-id="plan-people-counts">{{ peopleCounts }}</p>

          <ul class="hg-list plan__people">
            <!-- The organiser first; not an invitee, so not one of the "invitee" rows. -->
            <li class="hg-row plan__person" data-tst-id="plan-organiser">
              <UserAvatar :name="event.creatorName" :user-id="event.creatorId" :size="32" />
              <RouterLink
                class="hg-row__text plan__person-text"
                :to="{ name: 'person', params: { userId: event.creatorId } }"
              >
                <span class="hg-row__title">
                  {{ event.creatorName }}
                  <span v-if="isCreator" class="hg-soft">(you)</span>
                </span>
                <span class="hg-row__sub">{{ organiserLine }}</span>
              </RouterLink>
              <span class="hg-row__trail">
                <span class="hg-badge hg-badge--success">Coming</span>
              </span>
            </li>

            <li
              v-for="invitee in event.invitees"
              :key="invitee.invitationId"
              class="hg-row plan__person"
              :class="{ 'plan__person--confirming': removing === invitee.userId }"
              data-tst-id="invitee"
            >
              <UserAvatar :name="invitee.displayName" :user-id="invitee.userId" :size="32" />
              <RouterLink
                class="hg-row__text plan__person-text"
                :to="{ name: 'person', params: { userId: invitee.userId } }"
              >
                <span class="hg-row__title">
                  {{ invitee.displayName }}
                  <span v-if="invitee.userId === auth.state.userId" class="hg-soft">(you)</span>
                </span>
                <span v-if="guestPreference(invitee) !== ''" class="hg-row__sub" data-tst-id="invitee-preference">
                  {{ guestPreference(invitee) }}
                </span>
                <span v-else-if="preferenceAwaited(invitee)" class="hg-row__sub">Has not said where from</span>
              </RouterLink>

              <span class="hg-row__trail">
                <span class="hg-badge" :class="STATUS_LOOK[invitee.status].kind">
                  {{ STATUS_LOOK[invitee.status].text }}
                </span>

                <!-- The creator can show a guest the door: needed above all in a plan anyone can join. -->
                <button
                  v-if="
                    isCreator &&
                    active &&
                    removing !== invitee.userId &&
                    (invitee.status === 'ACCEPTED' || invitee.status === 'PENDING')
                  "
                  class="hg-iconbtn plan__remove"
                  type="button"
                  :aria-label="'Remove ' + invitee.displayName + ' from this plan'"
                  title="Remove from this plan"
                  data-tst-id="invitee-remove"
                  @click="removing = invitee.userId"
                >
                  <X class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                </button>
              </span>

              <!-- The confirmation takes a line of its own: the rail is too narrow to hold it beside the name. -->
              <span
                v-if="isCreator && active && removing === invitee.userId"
                class="hg-confirm plan__person-confirm"
                role="group"
                :aria-label="'Remove ' + invitee.displayName + ' for good?'"
              >
                <span class="hg-confirm__q">Remove for good?</span>
                <button
                  class="hg-btn hg-btn--danger-filled hg-btn--sm"
                  :class="{ 'is-loading': busy }"
                  type="button"
                  :disabled="busy"
                  data-tst-id="invitee-remove-confirm"
                  @click="removeGuest(invitee)"
                >
                  <span>Remove</span>
                </button>
                <button class="hg-btn hg-btn--quiet hg-btn--sm" type="button" :disabled="busy" @click="removing = null">
                  Keep
                </button>
              </span>
            </li>
          </ul>

          <p v-if="event.invitees.length === 0" class="plan__nobody" data-tst-id="plan-no-guests">
            {{
              active
                ? 'Nobody is invited yet. Send the link - whoever accepts appears here.'
                : 'Nobody joined this plan.'
            }}
          </p>
        </section>

        <!-- A guest who said yes can change their mind. -->
        <div v-if="active && mine?.status === 'ACCEPTED'" class="plan__end">
          <button
            v-if="!confirmingLeave"
            class="hg-btn hg-btn--quiet"
            type="button"
            data-tst-id="plan-leave"
            @click="confirmingLeave = true"
          >
            I can't come after all
          </button>
          <template v-else>
            <div class="hg-confirm plan__confirm" role="group" aria-label="Leave the plan?">
              <span class="hg-confirm__q">Leave the plan?</span>
              <button
                class="hg-btn hg-btn--danger-filled"
                :class="{ 'is-loading': busy }"
                type="button"
                :disabled="busy"
                data-tst-id="plan-leave-confirm"
                @click="leave"
              >
                <span>Leave</span>
              </button>
              <button class="hg-btn hg-btn--quiet" type="button" :disabled="busy" @click="confirmingLeave = false">
                Stay
              </button>
            </div>
            <p class="plan__end-note">You leave its chat too. You can join again later.</p>
          </template>
        </div>

        <div v-if="isCreator && active" class="plan__end">
          <button
            v-if="!confirmingCancel"
            class="hg-btn hg-btn--danger"
            type="button"
            data-tst-id="plan-cancel"
            @click="confirmingCancel = true"
          >
            Cancel the plan
          </button>
          <template v-else>
            <div class="hg-confirm plan__confirm" role="group" aria-label="Cancel the plan?">
              <span class="hg-confirm__q">Cancel the plan?</span>
              <button
                class="hg-btn hg-btn--danger-filled"
                :class="{ 'is-loading': busy }"
                type="button"
                :disabled="busy"
                data-tst-id="plan-cancel-confirm"
                @click="cancel"
              >
                <span>Yes, cancel</span>
              </button>
              <button class="hg-btn hg-btn--quiet" type="button" :disabled="busy" @click="confirmingCancel = false">
                Keep
              </button>
            </div>
            <p class="plan__end-note">It is cancelled for everyone and cannot be undone. The chat will stay.</p>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ---- the two columns ---- */
.plan__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--size-rail);
  align-items: start;
  gap: var(--s-7);
}

.plan__main,
.plan__rail {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  min-width: 0;
}

/* ---- header ---- */
.plan__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-3);
}

.plan__back {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  font: var(--t-body-strong);
}

.plan__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

/* A link that reads as text: main.css colours every link with the accent. */
.plan__by,
.plan__by:hover {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
  color: var(--c-ink);
  overflow-wrap: anywhere;
}

/* ---- the answer bar ---- */
.plan__answer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3) var(--s-4);
}

.plan__answer-q {
  flex: 1 1 auto;
  font: var(--t-title-3);
}

.plan__answer-actions {
  display: flex;
  gap: var(--s-2);
}

/* ---- the note and the dates ---- */
.plan__summary {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.plan__note {
  max-width: 70ch;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ---- sections ---- */
.plan__title {
  margin-bottom: var(--s-4);
  font: var(--t-title-2);
}

/* The one thing on the page still waiting for the viewer: a quiet reminder above the form. */
.plan__todo {
  margin-bottom: var(--s-4);
  color: var(--c-ink-soft);
}

.plan__rail-title {
  margin-bottom: var(--s-3);
  font: var(--t-title-3);
}

.plan__rail-title--tight {
  margin-bottom: var(--s-1);
}

/* ---- the link ---- */
.plan__share {
  display: flex;
  gap: var(--s-2);
}

/* ---- people ---- */
.plan__counts {
  margin-bottom: var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* Eight rows are seen; a longer list scrolls inside the rail. */
.plan__people {
  max-height: calc(var(--s-8) * 7 + var(--s-2));
  overflow-y: auto;
}

.plan__person {
  padding: 0;
}

.plan__person-text,
.plan__person-text:hover {
  color: var(--c-ink);
}

/* While a removal is being confirmed the row has two lines, and the line under the name moves
   under the whole row. */
.plan__person--confirming {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--c-line);
}

.plan__person--confirming .plan__person-text {
  border-bottom: 0;
}

.plan__person-confirm {
  flex: 1 0 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
  height: auto;
  padding-bottom: var(--s-2);
}

.plan__nobody {
  margin-top: var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* ---- leave or cancel ---- */
.plan__end {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-2);
}

/* "Cancel the plan? Yes, cancel / Keep" is wider than a narrow rail: let it wrap. */
.plan__confirm {
  flex-wrap: wrap;
  height: auto;
  min-height: var(--size-control);
}

.plan__end-note {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* ---- loading ---- */
.plan__skel--back {
  width: var(--s-8);
}

.plan__skel--title {
  width: 70%;
  height: var(--s-6);
}

.plan__skel--half {
  width: 50%;
}

.plan__skel--most {
  width: 85%;
}

.plan__skel--block {
  height: calc(var(--s-8) * 3);
  border-radius: var(--r-m);
}

.plan__skel--button {
  height: var(--size-control);
  border-radius: var(--r-m);
}

.plan__skel-people {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.plan__skel-person {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.plan__skel--avatar {
  flex: none;
  width: var(--s-6);
  height: var(--s-6);
}

.plan__skel--name {
  width: 60%;
}

/* ---- the "remove" button: small, and out of the way until the row is pointed at ---- */
@media (min-width: 768px) {
  .plan__remove {
    width: var(--size-control-sm);
    height: var(--size-control-sm);
  }
}

@media (hover: hover) {
  .plan__remove {
    opacity: 0;
  }

  .plan__person:hover .plan__remove,
  .plan__remove:focus-visible {
    opacity: 1;
  }
}

/* ---- narrower than 1024: the rail goes under the main column ---- */
@media (max-width: 1023px) {
  .plan__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s-6);
  }
}

/* Between a phone and 1024 the people stand in two columns, all of them (nothing scrolls inside). */
@media (min-width: 768px) and (max-width: 1023px) {
  .plan__people {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--s-5);
    max-height: none;
  }
}

/* ---- phone: buttons take the whole width ---- */
@media (max-width: 767px) {
  .plan__answer-actions {
    flex: 1 1 100%;
  }

  .plan__answer-actions .hg-btn {
    flex: 1 1 0;
  }

  .plan__end {
    align-items: stretch;
  }
}
</style>

