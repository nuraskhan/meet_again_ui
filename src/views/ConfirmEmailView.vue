<script setup lang="ts">
// "Enter the code": the only page there is for someone who registered or logged in and has not
// confirmed their e-mail yet. The letter carries a six-digit code; typed here, it opens the
// application. Until then the server refuses everything else such an account asks for.
//
// The page is reached from the login and registration forms only. An unconfirmed account is not
// remembered: after a reload the way back here is to log in again, which also sends a fresh code.
//
// The letter has a link too, for whoever opens it on another device. The page notices that by
// itself: it asks the server now and then, and whenever the person comes back to the tab.

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CircleAlert, Mail } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import HangeloLogo from '@/components/HangeloLogo.vue'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const route = useRoute()
const router = useRouter()

const CODE_LENGTH = 6
/** How often the page asks whether the link was opened elsewhere, while it is looked at. */
const CHECK_EVERY_MS = 8000

const code = ref<string>('')
const confirming = ref<boolean>(false)
const sending = ref<boolean>(false)
/** What went wrong with the code; empty = nothing. */
const error = ref<string>('')
/** What happened after "Send again"; empty before. */
const note = ref<string>('')
const noteFailed = ref<boolean>(false)

const field = ref<HTMLInputElement | null>(null)
let timer: number | undefined

const complete = computed<boolean>(() => code.value.length === CODE_LENGTH)

/** Where they were going before they were asked to log in: only our own paths. */
const nextPath = computed<string>(() => {
  const next: unknown = route.query.next
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : ''
})

/** Digits only, whatever is typed or pasted ("123 456", "Your code: 123456"). */
function onInput(event: Event): void {
  const typed: string = (event.target as HTMLInputElement).value
  code.value = typed.replace(/\D/g, '').slice(0, CODE_LENGTH)
  // The field shows what was kept, not what was typed.
  ;(event.target as HTMLInputElement).value = code.value
  error.value = ''
}

async function confirm(): Promise<void> {
  if (!complete.value || confirming.value) {
    return
  }
  confirming.value = true
  error.value = ''
  try {
    await api.confirmEmail(code.value)
    // The server says "confirmed" now: the pending token becomes a real one, and the watcher
    // below takes the person in.
    await auth.loadProfile()
  } catch (caught) {
    error.value = errorText(caught)
    code.value = ''
    await nextTick()
    field.value?.focus()
  } finally {
    confirming.value = false
  }
}

async function sendAgain(): Promise<void> {
  sending.value = true
  note.value = ''
  noteFailed.value = false
  try {
    await api.sendEmailVerification()
    note.value = 'A new code is on its way. The old one no longer works.'
    code.value = ''
    error.value = ''
    field.value?.focus()
  } catch (caught) {
    noteFailed.value = true
    note.value = errorText(caught)
  } finally {
    sending.value = false
  }
}

function logout(): void {
  auth.logout()
  void router.replace({ name: 'login' })
}

/** Was the link from the letter opened somewhere else. Quiet: it runs by itself. */
async function check(): Promise<void> {
  if (confirming.value) {
    return
  }
  try {
    await auth.loadProfile()
  } catch {
    // The next round asks again.
  }
}

function onVisible(): void {
  if (document.visibilityState === 'visible') {
    void check()
  }
}

// Confirmed: in, to where they were going.
watch(
  () => auth.isLoggedIn.value,
  (loggedIn) => {
    if (loggedIn) {
      void router.replace(nextPath.value === '' ? { name: 'plans' } : nextPath.value)
    }
  },
)

onMounted(() => {
  field.value?.focus()
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
      <form class="confirm__box" novalidate data-tst-id="confirm-email" @submit.prevent="confirm">
        <span class="confirm__mark">
          <Mail class="hg-icon hg-icon--48" :stroke-width="1.5" aria-hidden="true" />
        </span>
        <h1 class="confirm__title">Enter the code</h1>
        <p class="confirm__text">
          We sent a six-digit code to
          <b v-if="auth.state.profile !== null" data-tst-id="confirm-email-address">{{ auth.state.profile.email }}</b
          ><template v-else>your e-mail</template>. Type it here to start using Hangelo.
        </p>

        <label class="hg-sr" for="confirm-code">The six-digit code from the letter</label>
        <!-- One field, not six boxes: a code pasted whole, or offered by the phone from the
             letter ("one-time-code"), goes in at once. -->
        <input
          id="confirm-code"
          ref="field"
          class="hg-input confirm__code hg-num"
          :class="{ 'confirm__code--wrong': error !== '' }"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]*"
          :maxlength="CODE_LENGTH + 6"
          placeholder="••••••"
          :value="code"
          :disabled="confirming"
          :aria-invalid="error !== ''"
          :aria-describedby="error !== '' ? 'confirm-error' : undefined"
          data-tst-id="confirm-email-code"
          @input="onInput"
        />

        <p v-if="error !== ''" id="confirm-error" class="confirm__error" role="alert" data-tst-id="confirm-email-error">
          <CircleAlert class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span>{{ error }}</span>
        </p>

        <button
          class="hg-btn hg-btn--primary hg-btn--lg confirm__submit"
          :class="{ 'is-loading': confirming }"
          type="submit"
          :disabled="!complete || confirming"
          data-tst-id="confirm-email-submit"
        >
          <span>Confirm</span>
        </button>

        <p
          v-if="note !== ''"
          class="confirm__note"
          :class="{ 'confirm__note--failed': noteFailed }"
          role="status"
          data-tst-id="confirm-email-note"
        >
          {{ note }}
        </p>

        <p class="confirm__foot">
          No letter? Look in the spam folder, or
          <button
            class="hg-link confirm__linkbtn"
            type="button"
            :disabled="sending"
            data-tst-id="confirm-email-send"
            @click="sendAgain"
          >
            send it again</button
          >.
        </p>
        <p class="confirm__foot">
          Wrong address?
          <button class="hg-link confirm__linkbtn" type="button" data-tst-id="confirm-email-logout" @click="logout">
            Log out
          </button>
          and register again.
        </p>
      </form>
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
  max-width: 400px;
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

/* The code: large digits set apart, so six of them are read at a glance. The size is set with two
   classes, to stand against the phone rule that gives every field 16px text. */
.confirm__box .confirm__code {
  width: 100%;
  max-width: 260px;
  height: 64px;
  margin-top: var(--s-3);
  padding: 0 var(--s-3);
  font-size: 28px !important;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-align: center;
  /* The spacing after the last digit would push the row off-centre. */
  text-indent: 0.3em;
}

.confirm__code--wrong {
  border-color: var(--c-danger);
}

.confirm__error {
  display: flex;
  align-items: flex-start;
  gap: var(--s-2);
  color: var(--c-danger);
  font: var(--t-small);
  text-align: left;
}

.confirm__error .hg-icon {
  flex: none;
  width: 16px;
  height: 16px;
  margin-top: 2px;
}

.confirm__submit {
  width: 100%;
  max-width: 260px;
  margin-top: var(--s-2);
}

.confirm__note {
  color: var(--c-success);
  font: var(--t-small);
}

.confirm__note--failed {
  color: var(--c-danger);
}

.confirm__foot {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.confirm__note + .confirm__foot,
.confirm__submit + .confirm__foot {
  margin-top: var(--s-4);
}

.confirm__linkbtn {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}

.confirm__linkbtn:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 767px) {
  .confirm__main {
    align-items: start;
    padding: var(--s-5) var(--s-4);
  }
}
</style>
