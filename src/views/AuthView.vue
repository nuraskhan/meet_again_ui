<script setup lang="ts">
// Log in and register: one screen, two modes (the route decides which). The form is on the left;
// on a wide screen a decorative picture of the product stands on the right.

import { computed, ref, watch } from 'vue'
import { CircleAlert, Clock, Eye, EyeOff, MapPin, Star, Utensils, Wallet } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import HangeloLogo from '@/components/HangeloLogo.vue'
import { auth } from '@/stores/auth'
import { errorText } from '@/stores/toast'

const props = defineProps<{ mode: 'login' | 'register' }>()

const route = useRoute()
const router = useRouter()

const email = ref<string>('')
const password = ref<string>('')
const displayName = ref<string>('')
const error = ref<string>('')
const busy = ref<boolean>(false)
/** The password is shown as typed; only on this screen, never remembered. */
const passwordShown = ref<boolean>(false)

const isRegister = computed<boolean>(() => props.mode === 'register')

/** Where to go after a success: only our own paths, '' when none was asked for. */
const nextPath = computed<string>(() => {
  const next: unknown = route.query.next
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : ''
})

/** Sent here from an invitation link (/i/...): say why an account is asked for. */
const fromInvitation = computed<boolean>(() => nextPath.value.startsWith('/i/'))

// Switching between the two modes keeps what is typed but drops the old error.
watch(
  () => props.mode,
  () => {
    error.value = ''
  },
)

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true

  try {
    if (isRegister.value) {
      await auth.register(email.value, password.value, displayName.value)
    } else {
      await auth.login(email.value, password.value)
    }

    // The e-mail is not confirmed yet (always so right after registering): nothing is open but
    // the page that says "check your inbox".
    if (auth.isPending.value) {
      await router.replace({ name: 'confirm-email' })
      return
    }

    // Back to where they were going before they were asked to log in.
    const target: string = nextPath.value
    await router.replace(target === '' ? { name: 'plans' } : target)
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__pane">
      <form class="auth__form" data-tst-id="auth-form" @submit.prevent="submit">
        <div class="auth__top">
          <RouterLink class="auth__logo" :to="{ name: 'welcome' }" aria-label="Hangelo">
            <HangeloLogo />
          </RouterLink>
        </div>

        <p v-if="fromInvitation" class="auth__why">
          {{ isRegister ? 'Create an account to answer the invitation' : 'Sign in to answer the invitation' }}
        </p>
        <h1 class="auth__title">{{ isRegister ? 'Create account' : 'Log in' }}</h1>

        <label v-if="isRegister" class="hg-field">
          <span class="hg-field__label">Your name</span>
          <input
            v-model.trim="displayName"
            class="hg-input"
            type="text"
            autocomplete="name"
            maxlength="100"
            required
            placeholder="How friends know you"
            data-tst-id="auth-name"
          />
        </label>

        <label class="hg-field">
          <span class="hg-field__label">E-mail</span>
          <input
            v-model.trim="email"
            class="hg-input"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            data-tst-id="auth-email"
          />
        </label>

        <div class="hg-field">
          <label class="hg-field__label" for="auth-password">Password</label>
          <div class="hg-field__control">
            <input
              id="auth-password"
              v-model="password"
              class="hg-input hg-input--trail"
              :type="passwordShown ? 'text' : 'password'"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              :minlength="isRegister ? 6 : undefined"
              maxlength="100"
              required
              data-tst-id="auth-password"
            />
            <span class="hg-field__trail">
              <button
                type="button"
                class="hg-iconbtn"
                :aria-label="passwordShown ? 'Hide password' : 'Show password'"
                :title="passwordShown ? 'Hide password' : 'Show password'"
                :aria-pressed="passwordShown"
                @click="passwordShown = !passwordShown"
              >
                <EyeOff v-if="passwordShown" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <Eye v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              </button>
            </span>
          </div>
          <p v-if="isRegister" class="hg-field__msg">At least 6 characters.</p>
        </div>

        <p v-if="error !== ''" class="app-error" role="alert" data-tst-id="auth-error">
          <CircleAlert class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span>{{ error }}</span>
        </p>

        <button
          class="hg-btn hg-btn--primary hg-btn--block auth__submit"
          :class="{ 'is-loading': busy }"
          type="submit"
          :disabled="busy"
          data-tst-id="auth-submit"
        >
          <span>{{ isRegister ? 'Create account' : 'Log in' }}</span>
        </button>

        <p class="auth__switch">
          <template v-if="isRegister">
            Already have an account?
            <RouterLink class="auth__switch-link" :to="{ name: 'login', query: route.query }">Log in</RouterLink>
          </template>
          <template v-else>
            New here?
            <RouterLink class="auth__switch-link" :to="{ name: 'register', query: route.query }">
              Create an account
            </RouterLink>
          </template>
        </p>

      </form>
    </div>

    <!-- A picture of the product made of the product's own pieces; purely decorative.
         The same pieces stand beside the steps of WelcomeView. -->
    <div class="auth__side" aria-hidden="true">
      <div class="auth__art">
        <div class="hg-card hg-card--lg auth__art-plan">
          <div class="hg-plan hg-plan--compact">
            <span class="hg-plan__kind">
              <Utensils class="hg-icon" :stroke-width="1.5" />
              Dinner
            </span>
            <h3 class="hg-plan__title">Dinner on Friday</h3>
            <ul class="hg-plan__facts">
              <li class="hg-plan__fact"><Clock class="hg-icon" :stroke-width="1.5" />Fri, 20 Nov, 19:00</li>
              <li class="hg-plan__fact"><MapPin class="hg-icon" :stroke-width="1.5" />Up to 5 mi</li>
              <li class="hg-plan__fact"><Wallet class="hg-icon" :stroke-width="1.5" />$20–40</li>
            </ul>
          </div>
          <div class="auth__art-people">
            <span class="hg-stack">
              <span class="hg-avatar hg-avatar--32">AZ</span>
              <span class="hg-avatar hg-avatar--32">TK</span>
              <span class="hg-avatar hg-avatar--32">AS</span>
              <span class="hg-avatar hg-avatar--32">DM</span>
              <span class="hg-avatar hg-avatar--32 hg-stack__more">+2</span>
            </span>
            <span>6 coming</span>
          </div>
        </div>

        <div class="hg-chat auth__art-chat">
          <div class="hg-run">
            <span class="hg-avatar hg-avatar--32">TK</span>
            <div class="hg-run__body">
              <p class="hg-run__name">Timur</p>
              <p class="hg-bubble hg-bubble--first">Navat at seven works for me.</p>
            </div>
          </div>
          <div class="hg-run hg-run--own">
            <div class="hg-run__body">
              <p class="hg-bubble hg-bubble--own hg-bubble--first">Booked, under my name.</p>
            </div>
          </div>
        </div>

        <div class="hg-card hg-place auth__art-place">
          <h3 class="hg-place__name">Navat</h3>
          <span class="hg-place__cat">
            Central Asian
            <span class="hg-place__rating"><Star class="hg-icon" :stroke-width="1.5" />4.6</span>
          </span>
          <span class="hg-place__dist"><MapPin class="hg-icon" :stroke-width="1.5" />2.4 mi from you</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
}

.auth__pane {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: var(--s-7) var(--s-4);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  width: 100%;
  max-width: 400px;
}

.auth__top {
  margin-bottom: var(--s-5);
}

.auth__logo {
  display: inline-flex;
  color: var(--c-ink);
}

.auth__why {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.auth__title {
  margin-bottom: var(--s-2);
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

.auth__submit {
  margin-top: var(--s-2);
}

.auth__switch {
  color: var(--c-ink-soft);
  text-align: center;
}

.auth__switch-link {
  font: var(--t-body-strong);
  text-decoration: underline;
}

/* ---------------------------------------------------------------- the picture */

.auth__side {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: var(--s-7);
  background: var(--c-surface-soft);
}

/* Three pieces laid over each other; the offsets are the designers'. */
.auth__art {
  position: relative;
  flex: none;
  width: 530px;
  height: 440px;
}

.auth__art-plan {
  position: absolute;
  top: 0;
  left: 0;
  width: 340px;
  border-color: transparent;
  box-shadow: var(--shadow-2);
}

.auth__art-people {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-4);
}

.auth__art-chat {
  position: absolute;
  top: 210px;
  left: 230px;
  width: 300px;
}

.auth__art-place {
  position: absolute;
  top: 330px;
  left: 40px;
  width: 260px;
  box-shadow: var(--shadow-1);
}

/* The picture needs 530px plus its margins: below that there is room only for the form. */
@media (max-width: 1199px) {
  .auth__side {
    display: none;
  }
}

@media (max-width: 767px) {
  /* On a phone the form starts at the top, not in the middle of a tall screen. */
  .auth__pane {
    align-items: flex-start;
    padding: var(--s-5) var(--s-4) var(--s-7);
  }
}

</style>
