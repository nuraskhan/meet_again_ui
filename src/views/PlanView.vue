<script setup lang="ts">
// One plan: the invitation, who answered what, the way into its chat.

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { AppNotification, EventDto, Invitee } from '@/api/types'
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

/** What the others may know about a guest's preference: "Brooklyn · up to 5 mi". */
function guestPreference(invitee: Invitee): string {
  const parts: string[] = []
  if (invitee.locationText !== null) {
    parts.push(invitee.locationText)
  } else if (invitee.locationShared) {
    parts.push('location shared')
  }
  if (invitee.travelRadiusMi !== null) {
    parts.push('up to ' + invitee.travelRadiusMi + ' mi')
  }
  return parts.join(' · ')
}

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
// the "Loading…" that a first load shows, and without a complaint if it fails.
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
  try {
    if (accept) {
      await api.acceptInvitation(mine.value.invitationId)
      toastOk('You are in!')
    } else {
      await api.declineInvitation(mine.value.invitationId)
      toastOk('Declined. Maybe next time.')
    }
    await load()
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

const STATUS_LOOK: Record<Invitee['status'], { text: string; kind: string }> = {
  ACCEPTED: { text: 'In', kind: 'badge--yes' },
  DECLINED: { text: "Can't", kind: 'badge--no' },
  PENDING: { text: 'No answer yet', kind: 'badge--wait' },
  REMOVED: { text: 'Removed', kind: 'badge--no' },
}
</script>

<template>
  <main class="page">
    <RouterLink class="small plan__back" :to="{ name: 'plans' }">← All plans</RouterLink>

    <p v-if="loading && event === null" class="muted">Loading…</p>

    <div v-else-if="missing" class="empty" data-tst-id="plan-missing">
      <p>This plan does not exist, or you are not part of it.</p>
    </div>

    <template v-else-if="event !== null">
      <article class="card plan" data-tst-id="plan">
        <p
          v-if="!active"
          class="plan__closed"
          :class="{ 'form-error': event.status === 'CANCELLED' }"
          data-tst-id="plan-closed"
        >
          {{ event.status === 'EXPIRED' ? 'This plan is over.' : 'This plan was cancelled.' }}
        </p>

        <EventSummary :event="event" />

        <ProposedTimes :times="event.proposedTimes" />

        <p v-if="event.description" class="plan__note">{{ event.description }}</p>

        <p class="row small muted plan__by">
          <span>
            Invited by
            <template v-if="isCreator">you</template>
            <RouterLink v-else :to="{ name: 'person', params: { userId: event.creatorId } }">
              {{ event.creatorName }}
            </RouterLink>
          </span>
          <span v-if="event.visibility === 'PUBLIC'" class="badge" data-tst-id="plan-public">
            📣 Public · in the feed
          </span>
        </p>

        <!-- The invitee has not answered: the two buttons are the whole point of the page. -->
        <div v-if="active && mine?.status === 'PENDING'" class="row plan__actions">
          <button class="btn btn--yes" type="button" :disabled="busy" data-tst-id="plan-accept" @click="answer(true)">
            I'm in
          </button>
          <button class="btn btn--ghost" type="button" :disabled="busy" data-tst-id="plan-decline" @click="answer(false)">
            Can't make it
          </button>
        </div>

        <div class="row plan__actions">
          <RouterLink
            v-if="inChat"
            class="btn"
            :to="{ name: 'chat', params: { chatId: event.chatId } }"
            data-tst-id="plan-open-chat"
          >
            💬 Open the chat
          </RouterLink>
          <p v-else class="small muted">You are not coming, so you are not in the chat of this plan.</p>

          <!-- A guest who said yes can change their mind. -->
          <template v-if="active && mine?.status === 'ACCEPTED'">
            <button
              v-if="!confirmingLeave"
              class="btn btn--ghost btn--small plan__leave"
              type="button"
              data-tst-id="plan-leave"
              @click="confirmingLeave = true"
            >
              I can't come after all
            </button>
            <span v-else class="row plan__leave">
              <span class="small muted">Leave the plan and its chat?</span>
              <button class="btn btn--danger btn--small" type="button" :disabled="busy" data-tst-id="plan-leave-confirm" @click="leave">
                Yes, leave
              </button>
              <button class="btn btn--ghost btn--small" type="button" :disabled="busy" @click="confirmingLeave = false">
                Stay
              </button>
            </span>
          </template>
        </div>
      </article>

      <!-- Everyone coming says where they are and how far they travel; places are suggested from it. -->
      <section v-if="canSetPreference" class="section" data-tst-id="plan-preference">
        <h2 class="section__title">Your location and travel distance</h2>

        <div class="card" :class="{ 'plan__todo': event.myPreference === null }">
          <p v-if="event.myPreference === null" class="plan__todo-note" data-tst-id="plan-preference-todo">
            Tell the others where you are coming from and how far you can go.
          </p>
          <PreferenceForm :event-id="event.id" :current="event.myPreference" @saved="event = $event" />
        </div>
      </section>

      <SuggestedPlaces :event="event" :can-ask="canSetPreference" @updated="event = $event" />

      <!-- The link: only the creator gets it from the server. -->
      <section v-if="link !== '' && active" class="section" data-tst-id="plan-share">
        <h2 class="section__title">Invite by link</h2>

        <div class="card share">
          <p class="small muted">
            Anyone with this link can see the invitation. To accept it they log in or register.
          </p>
          <div class="share__row">
            <input
              class="input share__link"
              type="text"
              readonly
              :value="link"
              aria-label="Link to this invitation"
              data-tst-id="plan-share-link"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <button class="btn" type="button" data-tst-id="plan-share-copy" @click="copyLink">
              {{ copied ? 'Copied ✓' : 'Copy link' }}
            </button>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section__title">Who is invited</h2>

        <p v-if="event.invitees.length === 0" class="empty" data-tst-id="plan-no-guests">
          {{ active ? 'Nobody yet. Send the link above - whoever accepts appears here.' : 'Nobody joined this plan.' }}
        </p>

        <ul v-else class="card people">
          <li v-for="invitee in event.invitees" :key="invitee.invitationId" class="people__row" data-tst-id="invitee">
            <UserAvatar :name="invitee.displayName" :user-id="invitee.userId" />
            <span class="grow">
              <RouterLink class="people__name" :to="{ name: 'person', params: { userId: invitee.userId } }">
                {{ invitee.displayName }}
                <span v-if="invitee.userId === auth.state.userId" class="muted">(you)</span>
              </RouterLink>
              <span
                v-if="guestPreference(invitee) !== ''"
                class="small muted people__sub"
                data-tst-id="invitee-preference"
              >
                {{ guestPreference(invitee) }}
              </span>
            </span>
            <span class="badge" :class="STATUS_LOOK[invitee.status].kind">
              {{ STATUS_LOOK[invitee.status].text }}
            </span>

            <!-- The creator can show a guest the door: needed above all in a plan anyone can join. -->
            <template v-if="isCreator && active && (invitee.status === 'ACCEPTED' || invitee.status === 'PENDING')">
              <span v-if="removing === invitee.userId" class="row">
                <button
                  class="btn btn--danger btn--small"
                  type="button"
                  :disabled="busy"
                  data-tst-id="invitee-remove-confirm"
                  @click="removeGuest(invitee)"
                >
                  Remove for good
                </button>
                <button class="btn btn--ghost btn--small" type="button" :disabled="busy" @click="removing = null">
                  Keep
                </button>
              </span>
              <button
                v-else
                class="people__remove"
                type="button"
                :aria-label="'Remove ' + invitee.displayName + ' from this plan'"
                title="Remove from this plan"
                data-tst-id="invitee-remove"
                @click="removing = invitee.userId"
              >
                ✕
              </button>
            </template>
          </li>
        </ul>
      </section>

      <section v-if="isCreator && active" class="section">
        <button
          v-if="!confirmingCancel"
          class="btn btn--danger btn--small"
          type="button"
          data-tst-id="plan-cancel"
          @click="confirmingCancel = true"
        >
          Cancel this plan
        </button>

        <div v-else class="card plan__confirm" role="alertdialog" aria-label="Cancel this plan?">
          <p>Cancel the plan for everyone? This cannot be undone. The chat will stay.</p>
          <div class="row">
            <button class="btn btn--danger" type="button" :disabled="busy" data-tst-id="plan-cancel-confirm" @click="cancel">
              Yes, cancel it
            </button>
            <button class="btn btn--ghost" type="button" :disabled="busy" @click="confirmingCancel = false">
              Keep the plan
            </button>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.plan__back {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--c-ink-soft);
  font-weight: 600;
}

.plan {
  padding: 22px;
}

/* "Over" is a plain fact; "cancelled" is shown as a warning (form-error adds the colour). */
.plan__closed {
  padding: 10px 14px;
  border-radius: var(--radius-s);
  background: var(--c-surface-soft);
  color: var(--c-ink-soft);
  font-size: 0.9rem;
}

.plan__closed {
  margin-bottom: 16px;
}

.plan__note {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-s);
  background: var(--c-surface-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.plan__by {
  margin-top: 14px;
}

.plan__actions {
  margin-top: 16px;
}

.share {
  display: grid;
  gap: 12px;
}

.share__row {
  display: flex;
  gap: 10px;
}

.share__link {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .share__row {
    flex-direction: column;
  }
}

.people {
  display: grid;
  margin: 0;
  padding: 6px 18px;
  list-style: none;
}

.people__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.people__row + .people__row {
  border-top: 1px solid var(--c-line);
}

.people__name {
  color: inherit;
  display: block;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.people__sub {
  display: block;
  overflow-wrap: anywhere;
}

/* The one thing on the page still waiting for the guest. */
.plan__todo {
  border-color: color-mix(in srgb, var(--c-accent) 55%, var(--c-line));
}

.plan__todo-note {
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: var(--radius-s);
  background: var(--c-accent-soft);
  color: var(--c-accent);
  font-weight: 600;
}

.plan__leave {
  margin-left: auto;
}

.people__remove {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-ink-faint);
  cursor: pointer;
}

.people__remove:hover {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.plan__confirm {
  display: grid;
  gap: 14px;
  border-color: color-mix(in srgb, var(--c-danger) 45%, var(--c-line));
}
</style>
