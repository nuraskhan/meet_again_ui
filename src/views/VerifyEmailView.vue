<script setup lang="ts">
// The page the link in the confirmation letter opens. It hands the token to the server and says
// what came of it. Works logged in or not: the letter may be opened on another device.

import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
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
  <div class="verify-page">
    <RouterLink class="verify-page__logo" :to="{ name: auth.isLoggedIn.value ? 'plans' : 'welcome' }">
      meet again
    </RouterLink>

    <div class="card verify-page__card" data-tst-id="verify-email">
      <template v-if="state === 'checking'">
        <h1 class="verify-page__title">Confirming your e-mail…</h1>
      </template>

      <template v-else-if="state === 'confirmed'">
        <p class="verify-page__mark" aria-hidden="true">✓</p>
        <h1 class="verify-page__title" data-tst-id="verify-email-ok">Your e-mail is confirmed</h1>
        <p class="muted">We will remind you about your plans a day before they happen.</p>
        <RouterLink class="btn verify-page__button" :to="{ name: auth.isLoggedIn.value ? 'plans' : 'login' }">
          {{ auth.isLoggedIn.value ? 'Go to my plans' : 'Log in' }}
        </RouterLink>
      </template>

      <template v-else>
        <h1 class="verify-page__title" data-tst-id="verify-email-failed">That did not work</h1>
        <p class="muted">{{ failure }}</p>
        <p class="muted verify-page__hint">
          Log in and press "Send it again" at the top of the page to get a fresh link.
        </p>
        <RouterLink class="btn verify-page__button" :to="{ name: auth.isLoggedIn.value ? 'plans' : 'login' }">
          {{ auth.isLoggedIn.value ? 'Go to my plans' : 'Log in' }}
        </RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.verify-page {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 22px;
  min-height: 100vh;
  padding: 32px 16px;
}

.verify-page__logo {
  color: var(--c-ink);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.verify-page__card {
  width: 100%;
  max-width: 440px;
  padding: 30px;
  text-align: center;
}

.verify-page__mark {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--c-teal-soft);
  color: var(--c-teal);
  font-size: 1.6rem;
  font-weight: 700;
}

.verify-page__title {
  margin-bottom: 8px;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 600;
}

.verify-page__hint {
  margin-top: 8px;
}

.verify-page__button {
  margin-top: 20px;
}
</style>
