<script setup lang="ts">
// The page an invitation link opens. Anyone can read it; accepting needs an account, so a visitor
// is sent to register (or log in) and comes back here to press the button.

import { computed, onMounted, ref } from 'vue'
import { CalendarX, SearchX } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { PublicEvent } from '@/api/types'
import EventPicture from '@/components/EventPicture.vue'
import EventSummary from '@/components/EventSummary.vue'
import HangeloLogo from '@/components/HangeloLogo.vue'
import ProposedTimes from '@/components/ProposedTimes.vue'
import UserAvatar from '@/components/UserAvatar.vue'
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

/** "3 invited · 2 are coming", or nothing while nobody is invited. */
const crowd = computed<string>(() => {
  const current: PublicEvent | null = event.value
  if (current === null || current.invitedCount === 0) {
    return ''
  }
  return (
    current.invitedCount +
    ' invited · ' +
    current.goingCount +
    (current.goingCount === 1 ? ' is coming' : ' are coming')
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
    toastOk('You are in. The chat is waiting.')
    await router.replace({ name: 'plan', params: { eventId: joined.id } })
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="app-bare">
    <header class="app-bare__top invite-page__top">
      <RouterLink
        class="invite-page__logo"
        :to="{ name: auth.isLoggedIn.value ? 'plans' : 'welcome' }"
        aria-label="Hangelo"
      >
        <HangeloLogo />
      </RouterLink>

      <span class="app-grow"></span>

      <RouterLink
        v-if="!auth.isLoggedIn.value"
        class="hg-btn hg-btn--quiet"
        :to="{ name: 'login', query: { next: route.fullPath } }"
      >
        Log in
      </RouterLink>
    </header>

    <main class="invite-page__main">
      <!-- Loading: the outline of the card, so the page does not jump when the plan arrives. -->
      <div v-if="loading" class="hg-card invite-page__card" aria-busy="true">
        <div class="invite-page__body">
          <div class="invite-page__from">
            <span class="hg-skel hg-skel--circle invite-page__skel-avatar"></span>
            <span class="hg-skel hg-skel--line invite-page__skel-short"></span>
          </div>
          <span class="hg-skel invite-page__skel-title"></span>
          <span class="hg-skel hg-skel--line"></span>
          <span class="hg-skel hg-skel--line invite-page__skel-short"></span>
          <span class="hg-sr" role="status">Loading the invitation</span>
        </div>
      </div>

      <div v-else-if="missing || event === null" class="hg-empty" data-tst-id="invite-missing">
        <SearchX class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <h1 class="hg-empty__title">This invitation does not exist</h1>
        <p class="hg-empty__text">
          The link may be mistyped or cut off. Ask the person who sent it for a new one.
        </p>
      </div>

      <article v-else class="hg-card invite-page__card" data-tst-id="invite">
        <!-- The default picture of the activity: what a plan without a photo of its venue shows. -->
        <div class="invite-page__picture" data-tst-id="invite-picture">
          <EventPicture :type="event.eventType" />
        </div>

        <div class="invite-page__body">
          <div class="invite-page__from">
            <UserAvatar :name="event.creatorName" :size="64" />
            <p class="invite-page__from-text">
              <b>{{ event.creatorName }}</b> invites you
            </p>
          </div>

          <EventSummary :event="event" variant="full" />

          <p v-if="event.description" class="invite-page__note">{{ event.description }}</p>

          <ProposedTimes :times="event.proposedTimes" />

          <p v-if="crowd !== ''" class="invite-page__crowd" data-tst-id="invite-crowd">{{ crowd }}</p>
        </div>

        <div class="invite-page__foot">
          <p v-if="!active" class="invite-page__closed" data-tst-id="invite-cancelled">
            <CalendarX class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <span>{{ event.status === 'EXPIRED' ? 'This plan is over.' : 'This plan was cancelled.' }}</span>
          </p>

          <!-- Logged in: one button. -->
          <button
            v-else-if="auth.isLoggedIn.value"
            class="hg-btn hg-btn--primary hg-btn--block"
            :class="{ 'is-loading': busy }"
            type="button"
            :disabled="busy"
            data-tst-id="invite-accept"
            @click="accept"
          >
            <span>I'm in</span>
          </button>

          <!-- A visitor: accepting needs an account. They come back to this page afterwards. -->
          <template v-else>
            <RouterLink
              class="hg-btn hg-btn--primary hg-btn--block"
              :to="{ name: 'register', query: { next: route.fullPath } }"
              data-tst-id="invite-register"
            >
              Create account to answer
            </RouterLink>
            <RouterLink
              class="hg-btn hg-btn--outline hg-btn--block"
              :to="{ name: 'login', query: { next: route.fullPath } }"
              data-tst-id="invite-login"
            >
              Log in
            </RouterLink>
            <p class="invite-page__why">You need an account so the others know who is coming.</p>
          </template>
        </div>
      </article>
    </main>
  </div>
</template>

<style scoped>
.invite-page__top {
  padding: var(--s-5) var(--s-7);
}

.invite-page__logo {
  display: inline-flex;
  color: var(--c-ink);
}

.invite-page__main {
  display: flex;
  justify-content: center;
  padding: var(--s-6) var(--s-4) calc(var(--s-8) + var(--s-6));
}

/* The card is two bands - the plan and the answer - so its own padding is off. */
.invite-page__card {
  align-self: flex-start;
  width: 560px;
  max-width: 100%;
  padding: 0;
  border-radius: var(--r-l);
  overflow: hidden;
}

.invite-page__body {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-6) var(--s-6) var(--s-5);
}

/* The top band of the card; the card clips, so its rounded corners round the picture too. */
.invite-page__picture {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.invite-page__from {
  display: flex;
  align-items: center;
  gap: var(--s-4);
}

.invite-page__from-text {
  min-width: 0;
  font: var(--t-title-3);
  font-weight: 400;
  overflow-wrap: anywhere;
}

.invite-page__from-text b {
  font-weight: 600;
}

.invite-page__note {
  color: var(--c-ink-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.invite-page__foot {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-5) var(--s-6) var(--s-6);
  border-top: 1px solid var(--c-line);
  background: var(--c-surface-soft);
}

.invite-page__closed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  color: var(--c-ink-soft);
}

.invite-page__why {
  color: var(--c-ink-soft);
  font: var(--t-small);
  text-align: center;
}

.invite-page__skel-avatar {
  flex: none;
  width: 64px;
  height: 64px;
}

.invite-page__skel-title {
  width: 70%;
  height: var(--s-6);
}

.invite-page__skel-short {
  width: 40%;
}

@media (max-width: 767px) {
  .invite-page__top {
    padding: var(--s-4);
  }

  .invite-page__main {
    padding: var(--s-4) var(--s-4) var(--s-7);
  }

  .invite-page__body {
    padding: var(--s-5) var(--s-4) var(--s-4);
  }

  .invite-page__foot {
    padding: var(--s-4) var(--s-4) var(--s-5);
  }
}
</style>
