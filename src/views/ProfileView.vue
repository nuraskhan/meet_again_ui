<script setup lang="ts">
// The user's own profile: what friends see, the picture, and the way out.

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
})

const loading = ref<boolean>(true)
const busy = ref<boolean>(false)
const error = ref<string>('')

// ------------------------------------------------------------------ picture

// The same rules the server enforces. Checking here only saves the user a wasted upload: the
// server does not trust any of it and checks the content of the file itself.
const PICTURE_TYPES: string[] = ['image/jpeg', 'image/png']
const PICTURE_MAX_BYTES: number = 2 * 1024 * 1024

const pictureBusy = ref<boolean>(false)
const pictureError = ref<string>('')
const fileInput = ref<HTMLInputElement | null>(null)

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
}

async function save(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    // The server replaces the whole text part, so an emptied field is sent as "nothing".
    auth.state.profile = await api.updateMyProfile({
      displayName: form.displayName,
      bio: emptyToNull(form.bio),
      city: emptyToNull(form.city),
      birthDate: emptyToNull(form.birthDate),
    })
    fill()
    toastOk('Profile saved')
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}

async function onFileChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file: File | undefined = input.files?.[0]
  // Let the same file be chosen again after a refusal.
  input.value = ''

  if (file === undefined) {
    return
  }

  pictureError.value = ''

  if (!PICTURE_TYPES.includes(file.type)) {
    pictureError.value = 'Choose a JPEG or PNG picture.'
    return
  }
  if (file.size > PICTURE_MAX_BYTES) {
    pictureError.value = 'The picture is larger than 2 MB. Choose a smaller one.'
    return
  }

  pictureBusy.value = true
  try {
    auth.state.profile = await api.uploadAvatar(file)
    toastOk('Picture updated')
  } catch (caught) {
    pictureError.value = errorText(caught)
  } finally {
    pictureBusy.value = false
  }
}

async function removePicture(): Promise<void> {
  pictureError.value = ''
  pictureBusy.value = true
  try {
    auth.state.profile = await api.removeAvatar()
    toastOk('Picture removed')
  } catch (caught) {
    pictureError.value = errorText(caught)
  } finally {
    pictureBusy.value = false
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
          :avatar-url="auth.state.profile?.avatarUrl"
          :size="88"
        />

        <div class="grow">
          <p class="who__name">{{ form.displayName || 'Your name' }}</p>
          <p class="muted who__email" data-tst-id="profile-email">{{ auth.state.profile?.email }}</p>

          <div class="row who__picture">
            <!-- The real control is the hidden file input; the button opens it. -->
            <input
              ref="fileInput"
              class="who__file"
              type="file"
              accept="image/jpeg,image/png"
              aria-label="Choose a profile picture"
              data-tst-id="profile-picture-file"
              @change="onFileChosen"
            />
            <button
              class="btn btn--ghost btn--small"
              type="button"
              :disabled="pictureBusy"
              data-tst-id="profile-picture-upload"
              @click="fileInput?.click()"
            >
              {{ pictureBusy ? 'Uploading…' : auth.state.profile?.avatarUrl ? 'Change picture' : 'Upload picture' }}
            </button>
            <button
              v-if="auth.state.profile?.avatarUrl"
              class="btn btn--ghost btn--small"
              type="button"
              :disabled="pictureBusy"
              data-tst-id="profile-picture-remove"
              @click="removePicture"
            >
              Remove
            </button>
          </div>

          <p class="field__hint who__rules">JPEG or PNG, up to 2 MB.</p>
          <p v-if="pictureError !== ''" class="form-error who__error" role="alert" data-tst-id="profile-picture-error">
            {{ pictureError }}
          </p>
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
  align-items: flex-start;
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

.who__picture {
  margin-top: 12px;
}

/* Hidden from sight, still reachable by assistive technology through the button next to it. */
.who__file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.who__rules {
  margin-top: 6px;
}

.who__error {
  margin-top: 10px;
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
