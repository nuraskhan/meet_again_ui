<script setup lang="ts">
// One plan: the invitation, who answered what, the way into its chat.
// Two columns: what the plan is, its venue, where to go and the viewer's own location on the left;
// the chat, the link and the people in a rail on the right (under the rest on a narrow screen).
// After the plan is over its organiser marks here who said "coming" and did not come.

import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  CalendarX,
  Check,
  ChevronLeft,
  Globe,
  Link,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Trash2,
  X,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { AppNotification, EventDto, Invitee, Place, Preference } from '@/api/types'
import { onSignal } from '@/stores/signal'
import EventPicture from '@/components/EventPicture.vue'
import EventSummary from '@/components/EventSummary.vue'
import PlacePicker from '@/components/PlacePicker.vue'
import PlanSteps from '@/components/PlanSteps.vue'
import ChatView from '@/views/ChatView.vue'
import PreferenceForm from '@/components/PreferenceForm.vue'
import SuggestedPlaces from '@/components/SuggestedPlaces.vue'
import ProposedTimes from '@/components/ProposedTimes.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { EVENT_TYPE_LOOK, inviteLink } from '@/lib/format'
import { markLinkSent, planSteps, wasLinkSent, type PlanStep } from '@/lib/planSteps'
import { USER_STORY_PREFIX, useUserStory } from '@/lib/userStory'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const props = defineProps<{ eventId: number }>()

const router = useRouter()

// Under /user-story the page carries the guide through a plan; on its general address it does not.
const { inStory, storyTo } = useUserStory()

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

/** What this person has done in the plan and what to do now: the "What's next" guide. */
const steps = computed<PlanStep[]>(() =>
  event.value === null ? [] : planSteps(event.value, auth.state.userId, linkSent.value),
)

/** The organiser has shared or copied the link: inviting counts as done before the first guest appears. */
const linkSent = ref<boolean>(wasLinkSent(props.eventId))
watch(
  () => props.eventId,
  (eventId) => {
    linkSent.value = wasLinkSent(eventId)
  },
)

function rememberLinkSent(): void {
  markLinkSent(props.eventId)
  linkSent.value = true
}

/** The block of suggested places, to press its button from the guide. */
const places = ref<InstanceType<typeof SuggestedPlaces> | null>(null)
/** The section with the location form, to bring it into view from the guide. */
const preferenceSection = ref<HTMLElement | null>(null)

/** The location form itself, to unfold it when it shows only the saved line. */
const preferenceForm = ref<InstanceType<typeof PreferenceForm> | null>(null)

/** "Set my location" in the guide: the form comes into view, open, with the cursor in its first field. */
async function goToPreference(): Promise<void> {
  const section: HTMLElement | null = preferenceSection.value
  if (section === null) {
    return
  }
  preferenceForm.value?.open()
  await nextTick()
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  section.querySelector<HTMLInputElement>('input[type="text"]')?.focus({ preventScroll: true })
}

/** Places were suggested already: the guide then leads to them instead of asking again. */
const hasSuggestions = computed<boolean>(() => (event.value?.suggestions.length ?? 0) > 0)

/**
 * "Suggest places" in the guide: the same as the button of "Where to go", which comes into view.
 * With suggestions already there ("See the suggestions") it only brings them into view.
 */
function suggestPlaces(): void {
  document.getElementById(placesId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (!hasSuggestions.value) {
    void places.value?.ask()
  }
}

/** The chat of the plan in the rail, to bring it into view from the guide. */
const chatSection = ref<HTMLElement | null>(null)

/** "Say hello in the chat" in the guide: the chat comes into view with the cursor in its field. */
function goToChat(): void {
  const section: HTMLElement | null = chatSection.value
  if (section === null) {
    return
  }
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  section.querySelector<HTMLElement>('textarea, input[type="text"]')?.focus({ preventScroll: true })
}

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
/** The anchor of "Where to go", for the guide to scroll to. */
const placesId: string = useId()

/** The address to send to people; empty for everyone but the creator. */
const link = computed<string>(() => {
  const token: string | null | undefined = event.value?.shareToken
  if (!token) {
    return ''
  }
  // A link sent from the user story opens the invitation in the user story too.
  return inStory.value
    ? window.location.origin + USER_STORY_PREFIX + '/i/' + encodeURIComponent(token)
    : inviteLink(token)
})

const copied = ref<boolean>(false)

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
    rememberLinkSent()
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

/**
 * "Share": the share sheet of the device where there is one (a phone: messengers, mail, ...),
 * copying the link otherwise. The long address itself is no longer shown - nobody reads it.
 */
async function shareLink(): Promise<void> {
  const title: string = event.value?.title ?? 'Hangelo'
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: 'Join my plan: ' + title, url: link.value })
      rememberLinkSent()
      return
    } catch (caught) {
      // The person closed the sheet: nothing to do. Anything else: fall back to copying.
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return
      }
    }
  }
  await copyLink()
}

/** The creator pressed "Delete the plan" once and is asked to confirm. */
const confirmingDelete = ref<boolean>(false)

/** The plan and its chat disappear for everyone. */
async function deletePlan(): Promise<void> {
  busy.value = true
  try {
    await api.deleteEvent(props.eventId)
    toastOk('The plan and its chat are deleted')
    await router.push(storyTo('plans'))
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}

/** A guest clears a plan that is over or cancelled, and its chat, from their own lists. */
async function removeFromMyList(): Promise<void> {
  busy.value = true
  try {
    await api.leaveEvent(props.eventId)
    toastOk('Removed from your list')
    await router.push(storyTo('plans'))
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
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
  REQUESTED: { text: 'Asks to join', kind: 'hg-badge--warning' },
}

/** People who asked to join from the feed and wait for an answer. Only the organiser gets them. */
const requests = computed<Invitee[]>(() =>
  (event.value?.invitees ?? []).filter((invitee) => invitee.status === 'REQUESTED'),
)

// ---------------------------------------------------------------- the venue

/** Only the organiser chooses the venue, and only while the plan is on. */
const canChoosePlace = computed<boolean>(() => isCreator.value && active.value)

/** The dialog for choosing a venue is open. */
const pickerOpen = ref<boolean>(false)
/** A venue is being attached or taken off. */
const placeBusy = ref<boolean>(false)
/** The organiser pressed "Remove" on the venue once and is asked to confirm. */
const confirmingPlaceRemove = ref<boolean>(false)

/** From the dialog or from a suggestion: the place becomes the venue of the plan. */
async function choosePlace(placeId: number): Promise<void> {
  placeBusy.value = true
  try {
    event.value = await api.attachPlace(props.eventId, placeId)
    toastOk('The place is chosen')
    pickerOpen.value = false
    confirmingPlaceRemove.value = false
  } catch (caught) {
    toastError(caught)
  } finally {
    placeBusy.value = false
  }
}

async function removePlace(): Promise<void> {
  placeBusy.value = true
  try {
    event.value = await api.detachPlace(props.eventId)
    toastOk('The place is removed')
    confirmingPlaceRemove.value = false
  } catch (caught) {
    toastError(caught)
  } finally {
    placeBusy.value = false
  }
}

/** "12 Abay Ave, Almaty"; the city is not repeated when the address already ends with it. */
function placeAddress(place: Place): string {
  if (place.city === null || place.city === '' || place.address.includes(place.city)) {
    return place.address
  }
  return place.address + ', ' + place.city
}

/** The venue on OpenStreetMap with a marker on it, in a new tab. */
function placeMapLink(place: Place): string {
  const lat: string = place.latitude.toFixed(5)
  const lon: string = place.longitude.toFixed(5)
  return 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=17/' + lat + '/' + lon
}

/** Only an ordinary web address becomes a link; anything else stored as a "website" is ignored. */
function safeWebsite(website: string | null): string | null {
  return website !== null && /^https?:\/\//i.test(website) ? website : null
}

// ---------------------------------------------------------------- who came

/**
 * After the plan is over its organiser says who did not come. Nobody else is shown these marks:
 * who let the others down is between that person and the organiser.
 */
const canMarkCame = computed<boolean>(() => isCreator.value && event.value?.status === 'EXPIRED')

/** Only someone who said "coming" can have failed to come. */
function markable(invitee: Invitee): boolean {
  return canMarkCame.value && invitee.status === 'ACCEPTED'
}

const anyMarkable = computed<boolean>(() => guests.value.some(markable))

/** The guest whose mark is being saved right now (their user id), to disable the button. */
const marking = ref<number | null>(null)

async function markCame(invitee: Invitee, came: boolean): Promise<void> {
  marking.value = invitee.userId
  try {
    event.value = came
      ? await api.markCame(props.eventId, invitee.userId)
      : await api.markNoShow(props.eventId, invitee.userId)
    toastOk(came ? 'The mark is taken back' : invitee.displayName + ' is marked as not having come')
  } catch (caught) {
    toastError(caught)
  } finally {
    marking.value = null
  }
}

/** Everyone else in the list: invited, coming, declined, removed. */
const guests = computed<Invitee[]>(() =>
  (event.value?.invitees ?? []).filter((invitee) => invitee.status !== 'REQUESTED'),
)

/** The request being answered right now (the person's id), to disable its buttons. */
const answeringRequest = ref<number | null>(null)

async function answerRequest(invitee: Invitee, approve: boolean): Promise<void> {
  answeringRequest.value = invitee.userId
  try {
    event.value = approve
      ? await api.approveJoinRequest(props.eventId, invitee.userId)
      : await api.declineJoinRequest(props.eventId, invitee.userId)
    toastOk(approve ? invitee.displayName + ' is coming' : 'Declined')
  } catch (caught) {
    toastError(caught)
    // The request may have been taken back meanwhile: show the plan as it is now.
    await load()
  } finally {
    answeringRequest.value = null
  }
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
      <RouterLink class="hg-btn hg-btn--primary" :to="storyTo('plans')">My plans</RouterLink>
    </div>

    <div v-else-if="event !== null" class="plan__layout" data-tst-id="plan">
      <!-- ============================================================ the main column -->
      <div class="plan__main">
        <!-- The rule: a plan without a photo of its venue gets the default picture of its kind.
             Venues have no photos yet, so for now it is always this picture. -->
        <div class="plan__picture" data-tst-id="plan-picture">
          <EventPicture :type="event.eventType" />
        </div>

        <header class="plan__header">
          <RouterLink class="plan__back" :to="storyTo('plans')">
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
        <div
          v-if="!inStory && active && mine?.status === 'PENDING'"
          class="hg-card hg-card--accent plan__answer"
        >
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

        <!-- The user story (/user-story) only. What's next: the steps of the plan for this person, the
             one to do now with its button; it takes the place of the answer card above. -->
        <PlanSteps v-if="inStory" :steps="steps">
          <template #default="{ step }">
            <!-- A guest who has not answered: the two buttons are the whole point of the page. -->
            <template v-if="step.id === 'answer'">
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
            </template>

            <template v-else-if="step.id === 'invite'">
              <button class="hg-btn hg-btn--primary" type="button" data-tst-id="plan-step-share" @click="shareLink">
                <Share2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <span>Share the link</span>
              </button>
              <button class="hg-btn hg-btn--outline" type="button" data-tst-id="plan-step-copy" @click="copyLink">
                <Check v-if="copied" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <Link v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <span>{{ copied ? 'Copied' : 'Copy link' }}</span>
              </button>
            </template>

            <button
              v-else-if="step.id === 'where'"
              class="hg-btn hg-btn--primary"
              type="button"
              data-tst-id="plan-step-where"
              @click="goToPreference"
            >
              <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Set my location</span>
            </button>

            <!-- The organiser: places that suit everyone, or any place of their own choosing. -->
            <template v-else-if="step.id === 'place'">
              <button
                class="hg-btn hg-btn--primary"
                type="button"
                data-tst-id="plan-step-place"
                @click="suggestPlaces"
              >
                <span>{{ hasSuggestions ? 'See the suggestions' : 'Suggest places' }}</span>
              </button>
              <button
                class="hg-btn hg-btn--outline"
                type="button"
                :disabled="placeBusy"
                data-tst-id="plan-step-choose"
                @click="pickerOpen = true"
              >
                <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <span>Choose myself</span>
              </button>
            </template>

            <!-- A guest who is coming: the place is the organiser's to choose; the chat is open. -->
            <button
              v-else-if="step.id === 'wait'"
              class="hg-btn hg-btn--outline"
              type="button"
              data-tst-id="plan-step-chat"
              @click="goToChat"
            >
              <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Say hello in the chat</span>
            </button>
          </template>

          <template #done>
            <p class="plan__allset" data-tst-id="plan-allset">
              <b>All set.</b>
              {{ event.place !== null ? 'See you at ' + event.place.name + '.' : '' }}
              {{ inChat ? 'Anything else is settled in the chat.' : '' }}
            </p>
          </template>
        </PlanSteps>

        <section v-if="event.description || event.proposedTimes.length > 1" class="plan__summary">
          <p v-if="event.description" class="plan__note">{{ event.description }}</p>
          <ProposedTimes :times="event.proposedTimes" />
        </section>

        <!-- Everyone coming says where they are and how far they travel; places are suggested from it.
             It stands ABOVE the places: where a person is decides which places are near, so it is
             asked before a place is chosen or suggested, not after. -->
        <section
          v-if="canSetPreference && isCreator"
          ref="preferenceSection"
          class="plan__anchor"
          data-tst-id="plan-preference"
        >
          <h2 class="plan__title">Your location and distance</h2>
          <p v-if="event.myPreference === null" class="plan__todo" data-tst-id="plan-preference-todo">
            Tell the others where you are coming from and how far you can go.
          </p>
          <PreferenceForm ref="preferenceForm" :event-id="event.id" :current="event.myPreference" @saved="event = $event" />
        </section>

        <!-- The venue. A plan that is closed and never had one says nothing about it. -->
        <section v-if="event.place !== null || active" data-tst-id="plan-place">
          <h2 class="plan__title">Where</h2>

          <div v-if="event.place !== null" class="hg-card plan__place">
            <div class="plan__place-head">
              <h3 class="hg-place__name plan__place-name" data-tst-id="plan-place-name">{{ event.place.name }}</h3>
              <span v-if="event.place.sample" class="hg-badge" title="An invented place for demonstration">
                Sample
              </span>
            </div>

            <span class="hg-place__cat plan__place-cat">
              {{ EVENT_TYPE_LOOK[event.place.category].label }}
              <!-- Nobody has rated it: no stars at all, rather than "0.0". -->
              <span
                v-if="event.place.rating !== null"
                class="hg-place__rating"
                :aria-label="'Rated ' + event.place.rating.toFixed(1) + ' out of 5'"
              >
                <Star class="hg-icon" :stroke-width="1.5" aria-hidden="true" />{{ event.place.rating.toFixed(1) }}
              </span>
              <span v-if="event.place.rating !== null && event.place.reviewCount !== null" class="hg-num">
                ({{ event.place.reviewCount }} {{ event.place.reviewCount === 1 ? 'review' : 'reviews' }})
              </span>
            </span>

            <p class="plan__place-addr">
              <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>{{ placeAddress(event.place) }}</span>
            </p>

            <div class="plan__place-links">
              <a
                class="hg-link"
                :href="placeMapLink(event.place)"
                target="_blank"
                rel="noopener"
                data-tst-id="plan-place-map"
              >
                Open on the map
              </a>
              <a
                v-if="safeWebsite(event.place.website) !== null"
                class="hg-link"
                :href="safeWebsite(event.place.website) ?? undefined"
                target="_blank"
                rel="noopener noreferrer"
                data-tst-id="plan-place-website"
              >
                Website
              </a>
            </div>

            <div v-if="canChoosePlace" class="plan__place-actions">
              <template v-if="!confirmingPlaceRemove">
                <button
                  class="hg-btn hg-btn--outline hg-btn--sm"
                  type="button"
                  :disabled="placeBusy"
                  data-tst-id="plan-place-change"
                  @click="pickerOpen = true"
                >
                  <span>Change</span>
                </button>
                <button
                  class="hg-btn hg-btn--quiet hg-btn--sm"
                  type="button"
                  :disabled="placeBusy"
                  data-tst-id="plan-place-remove"
                  @click="confirmingPlaceRemove = true"
                >
                  <span>Remove</span>
                </button>
              </template>
              <div v-else class="hg-confirm plan__confirm" role="group" aria-label="Remove the place from the plan?">
                <span class="hg-confirm__q">Remove the place?</span>
                <button
                  class="hg-btn hg-btn--danger-filled hg-btn--sm"
                  :class="{ 'is-loading': placeBusy }"
                  type="button"
                  :disabled="placeBusy"
                  data-tst-id="plan-place-remove-confirm"
                  @click="removePlace"
                >
                  <span>Remove</span>
                </button>
                <button
                  class="hg-btn hg-btn--quiet hg-btn--sm"
                  type="button"
                  :disabled="placeBusy"
                  @click="confirmingPlaceRemove = false"
                >
                  Keep
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="canChoosePlace" class="plan__place-none">
            <p class="hg-soft">No place chosen yet.</p>
            <button
              class="hg-btn hg-btn--neutral"
              type="button"
              :disabled="placeBusy"
              data-tst-id="plan-place-choose"
              @click="pickerOpen = true"
            >
              <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Choose a place</span>
            </button>
          </div>

          <p v-else class="hg-soft" data-tst-id="plan-place-not-yet">The organiser has not chosen a place yet.</p>
        </section>

        <SuggestedPlaces
          :id="placesId"
          ref="places"
          class="plan__anchor"
          :event="event"
          :can-ask="canSetPreference"
          :can-choose="canChoosePlace"
          :choosing="placeBusy"
          @updated="event = $event"
          @choose="choosePlace"
        />

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
          <div class="plan__share">
            <button
              class="hg-btn hg-btn--neutral plan__share-main"
              type="button"
              data-tst-id="plan-share-button"
              @click="shareLink"
            >
              <Share2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Share</span>
            </button>
            <button
              class="hg-btn hg-btn--outline"
              type="button"
              :aria-label="copied ? 'Link copied' : 'Copy the link'"
              data-tst-id="plan-share-copy"
              @click="copyLink"
            >
              <Check v-if="copied" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <Link v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>{{ copied ? 'Copied' : 'Copy link' }}</span>
            </button>
          </div>
          <!-- The address itself, for a browser that can neither share nor copy: selectable, but
               out of the way. -->
          <input
            :id="linkId"
            class="plan__share-link"
            type="text"
            readonly
            aria-label="The link of the invitation"
            :value="link"
            data-tst-id="plan-share-link"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <p class="hg-field__msg plan__share-note">
            Anyone with the link can see the invitation. To accept it they log in or register.
          </p>
        </section>

        <!-- A public plan is joined by asking: the organiser lets people in one by one. -->
        <section v-if="isCreator && active && requests.length > 0" data-tst-id="plan-requests">
          <h2 class="plan__rail-title">Ask to join <span class="hg-count">{{ requests.length }}</span></h2>
          <ul class="hg-list plan__requests">
            <li
              v-for="invitee in requests"
              :key="invitee.invitationId"
              class="plan__request"
              data-tst-id="plan-request"
            >
              <RouterLink
                class="plan__request-who app-ink"
                :to="{ name: 'person', params: { userId: invitee.userId } }"
              >
                <UserAvatar :name="invitee.displayName" :user-id="invitee.userId" :size="32" />
                <span class="hg-row__title">{{ invitee.displayName }}</span>
              </RouterLink>
              <span class="plan__request-actions">
                <button
                  class="hg-btn hg-btn--primary hg-btn--sm"
                  type="button"
                  :disabled="answeringRequest === invitee.userId"
                  data-tst-id="plan-request-approve"
                  @click="answerRequest(invitee, true)"
                >
                  <span>Approve</span>
                </button>
                <button
                  class="hg-btn hg-btn--outline hg-btn--sm"
                  type="button"
                  :disabled="answeringRequest === invitee.userId"
                  data-tst-id="plan-request-decline"
                  @click="answerRequest(invitee, false)"
                >
                  <span>Decline</span>
                </button>
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="plan__rail-title plan__rail-title--tight">People</h2>
          <p class="plan__counts hg-num" data-tst-id="plan-people-counts">{{ peopleCounts }}</p>

          <p v-if="anyMarkable" class="plan__came-note" data-tst-id="plan-came-note">
            Mark anyone who said they were coming and did not come. It lowers their reliability rating.
          </p>

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
              v-for="invitee in guests"
              :key="invitee.invitationId"
              class="hg-row plan__person"
              :class="{ 'plan__person--confirming': removing === invitee.userId || markable(invitee) }"
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
                <!-- For the organiser a mark replaces "Coming": the two would contradict each other. -->
                <span
                  v-if="markable(invitee) && invitee.noShow"
                  class="hg-badge hg-badge--danger"
                  data-tst-id="invitee-no-show-badge"
                >
                  Did not come
                </span>
                <span v-else class="hg-badge" :class="STATUS_LOOK[invitee.status].kind">
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

              <!-- After the plan: did this guest come. A line of its own, as the confirmation above. -->
              <span v-if="markable(invitee)" class="plan__person-came">
                <button
                  v-if="invitee.noShow"
                  class="hg-btn hg-btn--quiet hg-btn--sm"
                  type="button"
                  :disabled="marking === invitee.userId"
                  :aria-label="'Undo: ' + invitee.displayName + ' did come'"
                  data-tst-id="invitee-came"
                  @click="markCame(invitee, true)"
                >
                  <span>Undo</span>
                </button>
                <button
                  v-else
                  class="hg-btn hg-btn--quiet hg-btn--sm"
                  type="button"
                  :disabled="marking === invitee.userId"
                  :aria-label="invitee.displayName + ' did not come'"
                  data-tst-id="invitee-no-show"
                  @click="markCame(invitee, false)"
                >
                  <span>Did not come</span>
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

        <!-- The chat of the plan, right here: reading and writing without leaving the page.
             The button at the top of the rail still opens it full size. -->
        <section v-if="inChat" ref="chatSection" class="plan__chat-section plan__anchor" data-tst-id="plan-chat">
          <h2 class="plan__rail-title plan__rail-title--tight">Chat</h2>
          <div class="plan__chat">
            <ChatView :key="event.chatId" :chat-id="event.chatId" embedded />
          </div>
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

        <!-- Deleting: the organiser's way to get rid of a plan and its chat altogether. -->
        <div v-if="isCreator" class="plan__end">
          <button
            v-if="!confirmingDelete"
            class="hg-btn hg-btn--quiet plan__delete"
            type="button"
            data-tst-id="plan-delete"
            @click="confirmingDelete = true"
          >
            <Trash2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <span>Delete the plan and its chat</span>
          </button>
          <template v-else>
            <div class="hg-confirm plan__confirm" role="group" aria-label="Delete the plan?">
              <span class="hg-confirm__q">Delete the plan?</span>
              <button
                class="hg-btn hg-btn--danger-filled"
                :class="{ 'is-loading': busy }"
                type="button"
                :disabled="busy"
                data-tst-id="plan-delete-confirm"
                @click="deletePlan"
              >
                <span>Yes, delete</span>
              </button>
              <button class="hg-btn hg-btn--quiet" type="button" :disabled="busy" @click="confirmingDelete = false">
                Keep
              </button>
            </div>
            <p class="plan__end-note">
              The plan and its chat disappear for everyone{{ active ? ', and the guests are told it is off' : '' }}.
              This cannot be undone.
            </p>
          </template>
        </div>

        <!-- A guest of a plan that is over or cancelled: off their own lists, chat included. -->
        <div
          v-if="!isCreator && !active && (mine?.status === 'ACCEPTED' || mine?.status === 'PENDING')"
          class="plan__end"
        >
          <button
            class="hg-btn hg-btn--quiet plan__delete"
            :class="{ 'is-loading': busy }"
            type="button"
            :disabled="busy"
            data-tst-id="plan-remove-from-list"
            @click="removeFromMyList"
          >
            <Trash2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <span>Remove from my list</span>
          </button>
          <p class="plan__end-note">The plan and its chat leave your lists. The others keep them.</p>
        </div>
      </aside>

      <!-- In the body, not here: a fixed layer inside the page column could be clipped or covered. -->
      <Teleport to="body">
        <PlacePicker
          v-if="pickerOpen"
          :category="event.eventType"
          :busy="placeBusy"
          :origin="
            event.myPreference !== null && event.myPreference.latitude !== null && event.myPreference.longitude !== null
              ? { latitude: event.myPreference.latitude, longitude: event.myPreference.longitude }
              : null
          "
          @choose="choosePlace($event.id)"
          @close="pickerOpen = false"
        />
      </Teleport>
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

/* ---- the picture: 16:9 while narrow, a band no taller than 240px when the column is wide ---- */
.plan__picture {
  width: 100%;
  max-height: 240px;
  aspect-ratio: 16 / 9;
  border-radius: var(--r-l);
  overflow: hidden;
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

/* ---- the guide ---- */
.plan__allset {
  flex: 1 1 0;
  min-width: 0;
}

/* A block the guide scrolls to: it stops below the top bar, not under it. */
.plan__anchor {
  scroll-margin-top: var(--s-8);
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

/* ---- the venue ---- */
.plan__place {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.plan__place-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

/* A long name or address without spaces must not push the card wider than its column. */
.plan__place-name,
.plan__place-addr {
  min-width: 0;
  overflow-wrap: anywhere;
}

.plan__place-cat {
  flex-wrap: wrap;
}

.plan__place-addr {
  display: flex;
  align-items: flex-start;
  gap: var(--s-2);
}

.plan__place-addr .hg-icon {
  flex: none;
  color: var(--c-ink-soft);
}

.plan__place-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-4);
  font: var(--t-small);
}

.plan__place-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-2);
}

.plan__place-none {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3) var(--s-4);
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
.plan__rail-title .hg-count {
  margin-left: var(--s-1);
  vertical-align: middle;
}

.plan__requests {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.plan__request {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3);
  border-radius: var(--r-m);
  background: var(--c-accent-soft);
}

.plan__request-who {
  display: flex;
  flex: 1 1 140px;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
}

.plan__request-actions {
  display: flex;
  gap: var(--s-2);
}

.plan__share {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.plan__share-main {
  flex: 1 1 120px;
}

/* The address: there for selecting by hand, looking like a quiet line of small text. */
.plan__share-link {
  width: 100%;
  margin-top: var(--s-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-ink-faint);
  font: var(--t-caption);
  text-overflow: ellipsis;
}

.plan__share-note {
  margin-top: var(--s-1);
}

.plan__delete {
  padding-left: var(--s-2);
  padding-right: var(--s-2);
}

/* The chat in the rail: a box of a fixed height - the messages scroll inside it, the field
   stays at its foot. (ChatView fills whatever box it is given.) */
.plan__chat {
  display: flex;
  height: 440px;
  border: 1px solid var(--c-line);
  border-radius: var(--r-m);
  overflow: hidden;
}

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

/* "Did not come" / "Undo": under the name, at the right, where the badge it changes is. */
.plan__person-came {
  display: flex;
  flex: 1 0 100%;
  justify-content: flex-end;
  padding-bottom: var(--s-2);
}

.plan__came-note {
  margin-bottom: var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-small);
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

