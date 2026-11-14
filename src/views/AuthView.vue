<script setup lang="ts">
// Log in and register: one screen, two modes (the route decides which).

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const isRegister = computed<boolean>(() => props.mode === 'register')

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

    // Back to where they were going before they were asked to log in; only our own paths.
    const next: unknown = route.query.next
    const target: string = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : ''
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
    <RouterLink class="auth__logo" :to="{ name: 'welcome' }">meet again</RouterLink>

    <form class="card auth__card stack" data-tst-id="auth-form" @submit.prevent="submit">
      <div>
        <h1 class="auth__title">{{ isRegister ? 'Create your account' : 'Welcome back' }}</h1>
        <p class="muted">
          {{ isRegister ? 'It takes less than a minute.' : 'Your friends have been waiting.' }}
        </p>
      </div>

      <label v-if="isRegister" class="field">
        <span class="field__label">Your name</span>
        <input
          v-model.trim="displayName"
          class="input"
          type="text"
          autocomplete="name"
          maxlength="100"
          required
          placeholder="How friends know you"
          data-tst-id="auth-name"
        />
      </label>

      <label class="field">
        <span class="field__label">E-mail</span>
        <input
          v-model.trim="email"
          class="input"
          type="email"
          autocomplete="email"
          required
          placeholder="you@example.com"
          data-tst-id="auth-email"
        />
      </label>

      <label class="field">
        <span class="field__label">Password</span>
        <input
          v-model="password"
          class="input"
          type="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          :minlength="isRegister ? 6 : undefined"
          maxlength="100"
          required
          data-tst-id="auth-password"
        />
        <span v-if="isRegister" class="field__hint">At least 6 characters.</span>
      </label>

      <p v-if="error !== ''" class="form-error" role="alert" data-tst-id="auth-error">{{ error }}</p>

      <button class="btn btn--block" type="submit" :disabled="busy" data-tst-id="auth-submit">
        {{ busy ? 'One moment…' : isRegister ? 'Create account' : 'Log in' }}
      </button>

      <p class="small muted auth__switch">
        <template v-if="isRegister">
          Already have an account?
          <RouterLink :to="{ name: 'login', query: route.query }">Log in</RouterLink>
        </template>
        <template v-else>
          New here?
          <RouterLink :to="{ name: 'register', query: route.query }">Create an account</RouterLink>
        </template>
      </p>
    </form>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 22px;
  min-height: 100vh;
  padding: 32px 16px;
}

.auth__logo {
  color: var(--c-ink);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.auth__card {
  width: 100%;
  max-width: 420px;
  padding: 28px;
  gap: 16px;
}

.auth__title {
  margin-bottom: 4px;
  font-family: var(--font-display);
  font-size: 1.7rem;
  font-weight: 600;
}

.auth__switch {
  text-align: center;
}
</style>
