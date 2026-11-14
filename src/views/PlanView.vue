<script setup lang="ts">
// One plan: the invitation, who answered what, the way into its chat.

import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { EventDto, Invitee } from '@/api/types'
import EventSummary from '@/components/EventSummary.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const props = defineProps<{ eventId: number }>()

const event = ref<EventDto | null>(null)
const loading = ref<boolean>(true)
const missing = ref<boolean>(false)
const busy = ref<boolean>(false)
/** The creator pressed "Cancel plan" once and is asked to confirm. */
const confirmingCancel = ref<boolean>(false)

const isCreator = computed<boolean>(() => event.value?.creatorId === auth.state.userId)
const active = computed<boolean>(() => event.value?.status === 'ACTIVE')

/** The current user's own invitation, if they are an invitee. */
const mine = computed<Invitee | undefined>(() =>
  event.value?.invitees.find((invitee) => invitee.userId === auth.state.userId),
)

/** Someone who declined is no longer in the chat. */
const inChat = computed<boolean>(() => isCreator.value || mine.value?.status !== 'DECLINED')

onMounted(load)
watch(() => props.eventId, load)

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

const STATUS_LOOK: Record<Invitee['status'], { text: string; kind: string }> = {
  ACCEPTED: { text: 'In', kind: 'badge--yes' },
  DECLINED: { text: "Can't", kind: 'badge--no' },
  PENDING: { text: 'No answer yet', kind: 'badge--wait' },
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
        <p v-if="!active" class="form-error plan__cancelled" data-tst-id="plan-cancelled">
          This plan was cancelled.
        </p>

        <EventSummary :event="event" />

        <p v-if="event.description" class="plan__note">{{ event.description }}</p>

        <p class="small muted plan__by">
          Invited by {{ isCreator ? 'you' : event.creatorName }}
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
          <p v-else class="small muted">You declined, so you are not in the chat of this plan.</p>
        </div>
      </article>

      <section class="section">
        <h2 class="section__title">Who is invited</h2>

        <ul class="card people">
          <li v-for="invitee in event.invitees" :key="invitee.invitationId" class="people__row" data-tst-id="invitee">
            <UserAvatar :name="invitee.displayName" :user-id="invitee.userId" />
            <span class="grow people__name">
              {{ invitee.displayName }}
              <span v-if="invitee.userId === auth.state.userId" class="muted">(you)</span>
            </span>
            <span class="badge" :class="STATUS_LOOK[invitee.status].kind">
              {{ STATUS_LOOK[invitee.status].text }}
            </span>
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

.plan__cancelled {
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
  font-weight: 600;
  overflow-wrap: anywhere;
}

.plan__confirm {
  display: grid;
  gap: 14px;
  border-color: color-mix(in srgb, var(--c-danger) 45%, var(--c-line));
}
</style>
