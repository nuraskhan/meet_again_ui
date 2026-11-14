<script setup lang="ts">
// Home of a logged-in user: invitations waiting for an answer, then every plan they are part of.

import { computed, onMounted, ref } from 'vue'
import { api } from '@/api'
import type { EventDto, Invitation } from '@/api/types'
import EventSummary from '@/components/EventSummary.vue'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const invitations = ref<Invitation[]>([])
const events = ref<EventDto[]>([])
const loading = ref<boolean>(true)
/** The invitation being answered right now, to disable its buttons. */
const answering = ref<number | null>(null)

// An unanswered invitation is shown at the top; the same event is not repeated in the list below.
const plans = computed<EventDto[]>(() => {
  const waiting = new Set<number>(invitations.value.map((invitation) => invitation.event.id))
  return events.value.filter((event) => !waiting.has(event.id))
})

onMounted(load)

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
  try {
    if (accept) {
      await api.acceptInvitation(invitation.invitationId)
      toastOk('You are in! The chat is waiting.')
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

/** "2 of 3 are in", or what the current user answered. */
function standing(event: EventDto): { text: string; kind: string } {
  if (event.status === 'CANCELLED') {
    return { text: 'Cancelled', kind: 'badge--no' }
  }

  const mine = event.invitees.find((invitee) => invitee.userId === auth.state.userId)
  if (mine?.status === 'DECLINED') {
    return { text: 'You declined', kind: 'badge--no' }
  }

  const going: number = event.invitees.filter((invitee) => invitee.status === 'ACCEPTED').length
  return {
    text: going + ' of ' + event.invitees.length + (going === 1 ? ' is in' : ' are in'),
    kind: going > 0 ? 'badge--yes' : 'badge--wait',
  }
}
</script>

<template>
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">Plans</h1>
      <RouterLink class="btn" :to="{ name: 'plan-new' }" data-tst-id="plans-new">+ New invitation</RouterLink>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <template v-else>
      <section v-if="invitations.length > 0" data-tst-id="plans-invitations">
        <h2 class="section__title">Waiting for your answer</h2>

        <div class="stack">
          <article
            v-for="invitation in invitations"
            :key="invitation.invitationId"
            class="card invitation"
            data-tst-id="invitation"
          >
            <p class="small muted invitation__from">
              <strong>{{ invitation.event.creatorName }}</strong> invites you
            </p>

            <EventSummary :event="invitation.event" />

            <p v-if="invitation.event.description" class="invitation__note">
              {{ invitation.event.description }}
            </p>

            <div class="row invitation__actions">
              <button
                class="btn btn--yes"
                type="button"
                :disabled="answering === invitation.invitationId"
                data-tst-id="invitation-accept"
                @click="answer(invitation, true)"
              >
                I'm in
              </button>
              <button
                class="btn btn--ghost"
                type="button"
                :disabled="answering === invitation.invitationId"
                data-tst-id="invitation-decline"
                @click="answer(invitation, false)"
              >
                Can't make it
              </button>
              <RouterLink
                class="small invitation__details"
                :to="{ name: 'plan', params: { eventId: invitation.event.id } }"
              >
                Details
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

      <section :class="{ section: invitations.length > 0 }">
        <h2 v-if="invitations.length > 0" class="section__title">Your plans</h2>

        <div v-if="plans.length > 0" class="stack">
          <RouterLink
            v-for="event in plans"
            :key="event.id"
            class="card card--link"
            :class="{ 'plan--off': event.status === 'CANCELLED' }"
            :to="{ name: 'plan', params: { eventId: event.id } }"
            data-tst-id="plan-card"
          >
            <EventSummary :event="event" />

            <div class="row plan__foot">
              <span class="badge" :class="standing(event).kind">{{ standing(event).text }}</span>
              <span class="small muted">
                {{ event.creatorId === auth.state.userId ? 'You invited' : event.creatorName + ' invited' }}
              </span>
            </div>
          </RouterLink>
        </div>

        <div v-else-if="invitations.length === 0" class="empty" data-tst-id="plans-empty">
          <p class="plans__empty-title">Nothing planned yet</p>
          <p>Send the first invitation - it takes a minute.</p>
          <RouterLink class="btn plans__empty-button" :to="{ name: 'plan-new' }">Invite friends</RouterLink>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.invitation {
  border-color: color-mix(in srgb, var(--c-accent) 45%, var(--c-line));
}

.invitation__from {
  margin-bottom: 12px;
}

.invitation__note {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-s);
  background: var(--c-surface-soft);
  overflow-wrap: anywhere;
}

.invitation__actions {
  margin-top: 16px;
}

.invitation__details {
  margin-left: auto;
}

.plan__foot {
  margin-top: 14px;
  justify-content: space-between;
}

.plan--off {
  opacity: 0.6;
}

.plans__empty-title {
  margin-bottom: 4px;
  color: var(--c-ink);
  font-size: 1.1rem;
  font-weight: 700;
}

.plans__empty-button {
  margin-top: 16px;
}
</style>
