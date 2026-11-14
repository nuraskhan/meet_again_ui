<script setup lang="ts">
// The page an invitation link opens. Anyone can read it; accepting needs an account, so a visitor
// is sent to register (or log in) and comes back here to press the button.

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { PublicEvent } from '@/api/types'
import EventSummary from '@/components/EventSummary.vue'
import ProposedTimes from '@/components/ProposedTimes.vue'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const props = defineProps<{ shareToken: string }>()

const route = useRoute()
const router = useRouter()

const event = ref<PublicEvent | null>(null)
const loading = ref<boolean>(true)
const missing = ref<boolean>(false)
const busy = ref<boolean>(false)

const active = computed<boolean>(() => event.value?.status === 'ACTIVE')

/** "3 invited · 2 are in", or nothing while nobody is. */
const crowd = computed<string>(() => {
  const current: PublicEvent | null = event.value
  if (current === null || current.invitedCount === 0) {
    return ''
  }
  return (
    current.invitedCount +
    ' invited · ' +
    current.goingCount +
    (current.goingCount === 1 ? ' is in' : ' are in')
  )
})

onMounted(async () => {
  try {
    event.value = await api.publicEvent(props.shareToken)
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    } else {
      toastError(caught)
    }
  } finally {
    loading.value = false
  }
})

async function accept(): Promise<void> {
  busy.value = true
  try {
    const joined = await api.joinEvent(props.shareToken)
    toastOk('You are in! The chat is waiting.')
    await router.replace({ name: 'plan', params: { eventId: joined.id } })
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="invite-page">
    <RouterLink class="invite-page__logo" :to="{ name: auth.isLoggedIn.value ? 'plans' : 'welcome' }">
      meet again
    </RouterLink>

    <p v-if="loading" class="muted">Loading…</p>

    <div v-else-if="missing || event === null" class="card invite-page__card" data-tst-id="invite-missing">
      <h1 class="invite-page__title">This invitation does not exist</h1>
      <p class="muted">The link may be mistyped or cut off. Ask the person who sent it for a new one.</p>
    </div>

    <article v-else class="card invite-page__card" data-tst-id="invite">
      <p class="invite-page__from">
        <strong>{{ event.creatorName }}</strong> invites you
      </p>

      <EventSummary :event="event" />

      <ProposedTimes :times="event.proposedTimes" />

      <p v-if="event.description" class="invite-page__note">{{ event.description }}</p>

      <p v-if="crowd !== ''" class="small muted invite-page__crowd" data-tst-id="invite-crowd">{{ crowd }}</p>

      <p v-if="!active" class="form-error invite-page__actions" data-tst-id="invite-cancelled">
        {{ event.status === 'EXPIRED' ? 'This plan is over.' : 'This plan was cancelled.' }}
      </p>

      <!-- Logged in: one button. -->
      <div v-else-if="auth.isLoggedIn.value" class="invite-page__actions">
        <button
          class="btn btn--yes btn--big btn--block"
          type="button"
          :disabled="busy"
          data-tst-id="invite-accept"
          @click="accept"
        >
          {{ busy ? 'One moment…' : "I'm in" }}
        </button>
      </div>

      <!-- A visitor: accepting needs an account. They come back to this page afterwards. -->
      <div v-else class="invite-page__actions stack">
        <RouterLink
          class="btn btn--big btn--block"
          :to="{ name: 'register', query: { next: route.fullPath } }"
          data-tst-id="invite-register"
        >
          Register to accept
        </RouterLink>
        <RouterLink
          class="btn btn--ghost btn--block"
          :to="{ name: 'login', query: { next: route.fullPath } }"
          data-tst-id="invite-login"
        >
          I already have an account
        </RouterLink>
        <p class="small muted invite-page__why">
          An account is needed so the others know who is coming and you get into the group chat.
        </p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.invite-page {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 22px;
  min-height: 100vh;
  padding: 32px 16px;
}

.invite-page__logo {
  color: var(--c-ink);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.invite-page__card {
  width: 100%;
  max-width: 480px;
  padding: 26px;
}

.invite-page__title {
  margin-bottom: 8px;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
}

.invite-page__from {
  margin-bottom: 16px;
  color: var(--c-ink-soft);
}

.invite-page__note {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-s);
  background: var(--c-surface-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.invite-page__crowd {
  margin-top: 14px;
}

.invite-page__actions {
  margin-top: 22px;
}

.invite-page__why {
  text-align: center;
}
</style>
