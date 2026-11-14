<script setup lang="ts">
// The page the link in the confirmation letter opens. It hands the token to the server and says
// what came of it. Works logged in or not: the letter may be opened on another device.

import { onMounted, ref } from 'vue'
import { Check, Mail, X } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import HangeloLogo from '@/components/HangeloLogo.vue'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const route = useRoute()

const state = ref<'checking' | 'confirmed' | 'failed'>('checking')
const failure = ref<string>('')

onMounted(async () => {
  const token: unknown = route.query.token

  if (typeof token !== 'string' || token === '') {
    state.value = 'failed'
    failure.value = 'This link is incomplete. Open it again from the letter.'
    return
  }

  try {
    await api.verifyEmail(token)
    state.value = 'confirmed'
    // If this browser is logged in, the strip asking to confirm should go away at once.
    auth.loadProfile().catch(() => {})
  } catch (caught) {
    state.value = 'failed'
    failure.value = errorText(caught)
  }
})
</script>

<template>
  <div class="app-bare">
    <header class="app-bare__top verify-page__top">
      <RouterLink
        class="verify-page__logo"
        :to="{ name: auth.isLoggedIn.value ? 'plans' : 'welcome' }"
        aria-label="Hangelo"
      >
        <HangeloLogo />
      </RouterLink>
    </header>

    <main class="verify-page__main">
      <div class="verify-page__box" data-tst-id="verify-email">
        <template v-if="state === 'checking'">
          <span class="verify-page__mark">
            <Mail class="hg-icon hg-icon--48" :stroke-width="1.5" aria-hidden="true" />
          </span>
          <h1 class="verify-page__title" role="status">Confirming your e-mail…</h1>
        </template>

        <template v-else-if="state === 'confirmed'">
          <span class="verify-page__mark verify-page__mark--ok">
            <Check class="hg-icon hg-icon--48" :stroke-width="1.5" aria-hidden="true" />
          </span>
          <h1 class="verify-page__title" data-tst-id="verify-email-ok">Your e-mail is confirmed</h1>
          <p class="verify-page__text">You will get reminders about your plans.</p>
          <RouterLink
            class="hg-btn hg-btn--primary verify-page__button"
            :to="{ name: auth.isLoggedIn.value ? 'plans' : 'login' }"
          >
            {{ auth.isLoggedIn.value ? 'Go to my plans' : 'Log in' }}
          </RouterLink>
        </template>

        <template v-else>
          <span class="verify-page__mark verify-page__mark--failed">
            <X class="hg-icon hg-icon--48" :stroke-width="1.5" aria-hidden="true" />
          </span>
          <h1 class="verify-page__title" data-tst-id="verify-email-failed">That did not work</h1>
          <p class="verify-page__text">{{ failure }}</p>
          <p class="verify-page__text">
            Log in and press "Send again" at the top of the page to get a fresh link.
          </p>
          <RouterLink
            class="hg-btn hg-btn--primary verify-page__button"
            :to="{ name: auth.isLoggedIn.value ? 'plans' : 'login' }"
          >
            {{ auth.isLoggedIn.value ? 'Go to my plans' : 'Log in' }}
          </RouterLink>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.verify-page__top {
  padding: var(--s-5) var(--s-7);
}

.verify-page__logo {
  display: inline-flex;
  color: var(--c-ink);
}

.verify-page__main {
  display: flex;
  justify-content: center;
  padding: calc(var(--s-8) + var(--s-7)) var(--s-4);
}

.verify-page__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  width: 440px;
  max-width: 100%;
  text-align: center;
}

.verify-page__mark {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: var(--r-full);
  background: var(--c-surface-soft);
  color: var(--c-ink-soft);
}

.verify-page__mark--ok {
  background: var(--c-success-soft);
  color: var(--c-success);
}

.verify-page__mark--failed {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.verify-page__title {
  margin-top: var(--s-2);
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

.verify-page__text {
  color: var(--c-ink-soft);
  overflow-wrap: anywhere;
}

.verify-page__button {
  margin-top: var(--s-4);
}

@media (max-width: 767px) {
  .verify-page__top {
    padding: var(--s-4);
  }

  .verify-page__main {
    padding: var(--s-7) var(--s-4);
  }

  .verify-page__button {
    width: 100%;
  }
}
</style>
