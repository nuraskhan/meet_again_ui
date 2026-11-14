<script setup lang="ts">
// The user's own profile: what friends see, and the way out.

import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import UserAvatar from '@/components/UserAvatar.vue'
import { auth } from '@/stores/auth'
import { errorText, toastError, toastOk } from '@/stores/toast'

const form = reactive({
  displayName: '',
  bio: '',
  city: '',
  birthDate: '',
  avatarUrl: '',
})

const loading = ref<boolean>(true)
const busy = ref<boolean>(false)
const error = ref<string>('')

onMounted(async () => {
  try {
    await auth.loadProfile()
    fill()
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
})

function fill(): void {
  const profile = auth.state.profile
  if (profile === null) {
    return
  }
  form.displayName = profile.displayName
  form.bio = profile.bio ?? ''
  form.city = profile.city ?? ''
  form.birthDate = profile.birthDate ?? ''
  form.avatarUrl = profile.avatarUrl ?? ''
}

async function save(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    // The server replaces the whole editable part, so an emptied field is sent as "nothing".
    auth.state.profile = await api.updateMyProfile({
      displayName: form.displayName,
      bio: emptyToNull(form.bio),
      city: emptyToNull(form.city),
      birthDate: emptyToNull(form.birthDate),
      avatarUrl: emptyToNull(form.avatarUrl),
    })
    fill()
    toastOk('Profile saved')
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}

function emptyToNull(value: string): string | null {
  const trimmed: string = value.trim()
  return trimmed === '' ? null : trimmed
}
</script>

<template>
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">Profile</h1>
      <button class="btn btn--ghost btn--small" type="button" data-tst-id="profile-logout" @click="auth.logout()">
        Log out
      </button>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <template v-else>
      <div class="card who">
        <UserAvatar
          :name="form.displayName || '?'"
          :user-id="auth.state.userId ?? 0"
          :avatar-url="form.avatarUrl || null"
          :size="72"
        />
        <div class="grow">
          <p class="who__name">{{ form.displayName || 'Your name' }}</p>
          <p class="muted who__email" data-tst-id="profile-email">{{ auth.state.profile?.email }}</p>
        </div>
      </div>

      <form class="card stack section" data-tst-id="profile-form" @submit.prevent="save">
        <label class="field">
          <span class="field__label">Name</span>
          <input
            v-model.trim="form.displayName"
            class="input"
            type="text"
            maxlength="100"
            required
            autocomplete="name"
            data-tst-id="profile-name"
          />
          <span class="field__hint">This is how your friends see you.</span>
        </label>

        <div class="pair">
          <label class="field">
            <span class="field__label">City</span>
            <input v-model="form.city" class="input" type="text" maxlength="100" data-tst-id="profile-city" />
          </label>

          <label class="field">
            <span class="field__label">Date of birth</span>
            <input v-model="form.birthDate" class="input" type="date" data-tst-id="profile-birth-date" />
          </label>
        </div>

        <label class="field">
          <span class="field__label">About you</span>
          <textarea
            v-model="form.bio"
            class="input"
            maxlength="1000"
            placeholder="What you like to do with friends"
            data-tst-id="profile-bio"
          ></textarea>
        </label>

        <label class="field">
          <span class="field__label">Picture</span>
          <input
            v-model="form.avatarUrl"
            class="input"
            type="url"
            maxlength="500"
            placeholder="https://…"
            data-tst-id="profile-avatar"
          />
          <span class="field__hint">A link to an image. Leave empty to show your initials.</span>
        </label>

        <p v-if="error !== ''" class="form-error" role="alert">{{ error }}</p>

        <div>
          <button class="btn" type="submit" :disabled="busy" data-tst-id="profile-save">
            {{ busy ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </template>
  </main>
</template>

<style scoped>
.who {
  display: flex;
  align-items: center;
  gap: 18px;
}

.who__name {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.who__email {
  overflow-wrap: anywhere;
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 520px) {
  .pair {
    grid-template-columns: 1fr;
  }
}
</style>
