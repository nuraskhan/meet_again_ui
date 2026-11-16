<script setup lang="ts">
// "Check your inbox": the only page there is for someone who registered (or logged in) and has
// not confirmed their e-mail yet. Until the link from the letter is opened the application is
// closed - the server refuses everything else such an account asks for.
//
// The page lets the person in by itself once the link was opened, wherever it was opened: it asks
// the server again every few seconds and whenever the person comes back to the tab.

import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Mail } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import HangeloLogo from '@/components/HangeloLogo.vue'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const router = useRouter()

/** How often the page asks whether the link was opened, while it is looked at. */
const CHECK_EVERY_MS = 5000

const sending = ref<boolean>(false)
const checking = ref<boolean>(false)
/** What happened after a button was pressed; empty before. */
const note = ref<string>('')
const failed = ref<boolean>(false)

let timer: number | undefined

/** Asks the server whether the e-mail is confirmed now. Quiet: it runs by itself. */
async function check(): Promise<void> {
  try {
    await auth.loadProfile()
  } catch {
    // The next round asks again.
  }
}

/** The button "I have confirmed": the same question, with an answer said aloud. */
async function checkNow(): Promise<void> {
  checking.value = true
  note.value = ''
  failed.value = false
  await check()
  checking.value = false
  if (auth.isPending.value) {
    failed.value = true
    note.value = 'Not confirmed yet. Open the link in the letter, then come back here.'
  }
}

async function sendAgain(): Promise<void> {
  sending.value = true
  note.value = ''
  failed.value = false
  try {
    await api.sendEmailVerification()
    note.value = 'Sent. Check your inbox.'
  } catch (caught) {
    failed.value = true
    note.value = errorText(caught)
  } finally {
    sending.value = false
  }
}

function logout(): void {
  auth.logout()
  void router.replace({ name: 'login' })
}

function onVisible(): void {
  if (document.visibilityState === 'visible') {
    void check()
  }
}

// Confirmed: in.
watch(
  () => auth.isLoggedIn.value,
  (loggedIn) => {
    if (loggedIn) {
      void router.replace({ name: 'plans' })
    }
  },
)

onMounted(() => {
  void check()
  timer = window.setInterval(() => {
    // A tab nobody looks at asks nothing.
    if (document.visibilityState === 'visible') {
      void check()
    }
  }, CHECK_EVERY_MS)
  document.addEventListener('visibilitychange', onVisible)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <div class="app-bare">
    <header class="app-bare__top confirm__top">
      <span class="confirm__logo"><HangeloLogo /></span>
    </header>

    <main class="confirm__main">
      <div class="confirm__box" data-tst-id="confirm-email">
        <span class="confirm__mark">
          <Mail class="hg-icon hg-icon--48" :stroke-width="1.5" aria-hidden="true" />
        </span>
        <h1 class="confirm__title">Check your inbox</h1>
        <p class="confirm__text">
          We sent a link to
          <b v-if="auth.state.profile !== null" data-tst-id="confirm-email-address">{{ auth.state.profile.email }}</b
          ><template v-else>your e-mail</template>. Open it to start using Hangelo: until then nothing else is
          open.
        </p>

        <p
          v-if="note !== ''"
          class="confirm__note"
          :class="{ 'confirm__note--failed': failed }"
          role="status"
          data-tst-id="confirm-email-note"
        >
          {{ note }}
        </p>

        <div class="confirm__actions">
          <button
            class="hg-btn hg-btn--primary"
            :class="{ 'is-loading': checking }"
            type="button"
            :disabled="checking"
            data-tst-id="confirm-email-check"
            @click="checkNow"
          >
            <span>I have confirmed</span>
          </button>
          <button
            class="hg-btn hg-btn--outline"
            :class="{ 'is-loading': sending }"
            type="button"
            :disabled="sending"
            data-tst-id="confirm-email-send"
            @click="sendAgain"
          >
            <span>Send again</span>
          </button>
        </div>

        <p class="confirm__foot">
          Wrong address?
          <button class="hg-link confirm__logout" type="button" data-tst-id="confirm-email-logout" @click="logout">
            Log out
          </button>
          and register again.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.confirm__top {
  justify-content: center;
}

.confirm__logo {
  display: inline-flex;
}

.confirm__main {
  display: grid;
  flex: 1;
  place-items: center;
  padding: var(--s-7) var(--s-5);
}

.confirm__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  width: 100%;
  max-width: 440px;
  text-align: center;
}

.confirm__mark {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  border-radius: var(--r-full);
  background: var(--c-accent-soft);
  color: var(--c-accent-text);
}

.confirm__title {
  margin-top: var(--s-3);
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

.confirm__text {
  color: var(--c-ink-soft);
  overflow-wrap: anywhere;
}

.confirm__text b {
  color: var(--c-ink);
}

.confirm__note {
  color: var(--c-success);
  font: var(--t-small);
}

.confirm__note--failed {
  color: var(--c-danger);
}

.confirm__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-2);
  margin-top: var(--s-3);
}

.confirm__foot {
  margin-top: var(--s-4);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.confirm__logout {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}

@media (max-width: 767px) {
  .confirm__main {
    padding: var(--s-5) var(--s-4);
  }

  .confirm__actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>
