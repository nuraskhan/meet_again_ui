<script setup lang="ts">
// The user's own profile: photos, what they say about themselves, interests, prompts - and the way
// out. What others see of it is PersonView.

import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import { serverFileUrl } from '@/api/http'
import type { Photo, Prompt } from '@/api/types'
import UserAvatar from '@/components/UserAvatar.vue'
import { auth } from '@/stores/auth'
import { errorText, toastError, toastOk } from '@/stores/toast'

// ------------------------------------------------------------------ limits (the server enforces the same)

const MAX_INTERESTS = 10
const MAX_INTEREST_LENGTH = 30
const MAX_PROMPTS = 3

/** Questions offered for a prompt. The person may also type their own. */
const PROMPT_QUESTIONS: string[] = [
  'My perfect weekend',
  'Ask me about',
  'I never say no to',
  'The way to my heart',
  'Two truths and a lie',
  'You should invite me if',
  'I am weirdly good at',
  'My go-to order',
]

const PRIVILEGE_NAME: Record<string, string> = { STANDARD: 'Standard', PRO: 'Pro', MAX: 'Max' }

// ------------------------------------------------------------------ the text part

const form = reactive({
  displayName: '',
  birthDate: '',
  pronouns: '',
  city: '',
  hometown: '',
  occupation: '',
  education: '',
  languages: '',
  bio: '',
  interests: [] as string[],
  prompts: [] as Prompt[],
})

const interestDraft = ref<string>('')

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
  form.birthDate = profile.birthDate ?? ''
  form.pronouns = profile.pronouns ?? ''
  form.city = profile.city ?? ''
  form.hometown = profile.hometown ?? ''
  form.occupation = profile.occupation ?? ''
  form.education = profile.education ?? ''
  form.languages = profile.languages ?? ''
  form.bio = profile.bio ?? ''
  form.interests = [...profile.interests]
  form.prompts = profile.prompts.map((prompt) => ({ ...prompt }))
}

/** Adds what is typed as an interest. Commas separate several: "chess, hiking". */
function addInterest(): void {
  for (const piece of interestDraft.value.split(',')) {
    const label: string = piece.trim().slice(0, MAX_INTEREST_LENGTH)
    const known: boolean = form.interests.some((existing) => existing.toLowerCase() === label.toLowerCase())
    if (label !== '' && !known && form.interests.length < MAX_INTERESTS) {
      form.interests.push(label)
    }
  }
  interestDraft.value = ''
}

function addPrompt(): void {
  // The first question nobody has answered yet.
  const used = new Set<string>(form.prompts.map((prompt) => prompt.question))
  const question: string = PROMPT_QUESTIONS.find((candidate) => !used.has(candidate)) ?? ''
  form.prompts.push({ question, answer: '' })
}

async function save(): Promise<void> {
  // Something typed in the interest box and not added yet belongs to the profile too.
  addInterest()

  error.value = ''
  busy.value = true
  try {
    // The server replaces the whole, so an emptied field is sent as "nothing". A prompt left
    // without a question or an answer is dropped, not sent to be refused.
    auth.state.profile = await api.updateMyProfile({
      displayName: form.displayName,
      birthDate: emptyToNull(form.birthDate),
      pronouns: emptyToNull(form.pronouns),
      city: emptyToNull(form.city),
      hometown: emptyToNull(form.hometown),
      occupation: emptyToNull(form.occupation),
      education: emptyToNull(form.education),
      languages: emptyToNull(form.languages),
      bio: emptyToNull(form.bio),
      interests: form.interests,
      prompts: form.prompts.filter((prompt) => prompt.question.trim() !== '' && prompt.answer.trim() !== ''),
    })
    fill()
    toastOk('Profile saved')
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}

// ------------------------------------------------------------------ photos

// The same rules the server enforces. Checking here only saves the user a wasted upload: the
// server does not trust any of it and checks the content of the file itself.
const PHOTO_TYPES: string[] = ['image/jpeg', 'image/png']
const PHOTO_MAX_BYTES: number = 6 * 1024 * 1024

const photoBusy = ref<boolean>(false)
const photoError = ref<string>('')
const fileInput = ref<HTMLInputElement | null>(null)

const photos = computed<Photo[]>(() => auth.state.profile?.photos ?? [])
const maxPhotos = computed<number>(() => auth.state.profile?.maxPhotos ?? 0)
const canAddPhoto = computed<boolean>(() => photos.value.length < maxPhotos.value)

async function onFileChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file: File | undefined = input.files?.[0]
  // Let the same file be chosen again after a refusal.
  input.value = ''

  if (file === undefined) {
    return
  }

  photoError.value = ''

  if (!PHOTO_TYPES.includes(file.type)) {
    photoError.value = 'Choose a JPEG or PNG picture.'
    return
  }
  if (file.size > PHOTO_MAX_BYTES) {
    photoError.value = 'The picture is larger than 6 MB. Choose a smaller one.'
    return
  }

  await changePhotos(() => api.uploadPhoto(file), 'Photo added')
}

async function removePhoto(photo: Photo): Promise<void> {
  await changePhotos(() => api.removePhoto(photo.id), 'Photo removed')
}

async function makeMain(photo: Photo): Promise<void> {
  await changePhotos(() => api.makeMainPhoto(photo.id), 'Main photo changed')
}

/** Runs one change of the photos; the server answers with the whole profile as it now is. */
async function changePhotos(change: () => Promise<typeof auth.state.profile>, done: string): Promise<void> {
  photoError.value = ''
  photoBusy.value = true
  try {
    auth.state.profile = await change()
    toastOk(done)
  } catch (caught) {
    photoError.value = errorText(caught)
  } finally {
    photoBusy.value = false
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
          :size="72"
        />
        <div class="grow">
          <p class="who__name">{{ form.displayName || 'Your name' }}</p>
          <p class="muted who__email" data-tst-id="profile-email">{{ auth.state.profile?.email }}</p>
          <p class="row who__meta">
            <span class="badge" data-tst-id="profile-privilege">
              {{ PRIVILEGE_NAME[auth.state.profile?.privilege ?? 'STANDARD'] }} plan
            </span>
            <RouterLink
              v-if="auth.state.userId !== null"
              class="small"
              :to="{ name: 'person', params: { userId: auth.state.userId } }"
              data-tst-id="profile-preview"
            >
              See how others see it
            </RouterLink>
          </p>
        </div>
      </div>

      <!-- ------------------------------------------------------------ photos -->
      <section class="section">
        <h2 class="section__title">Photos · {{ photos.length }} of {{ maxPhotos }}</h2>

        <div class="card">
          <ul class="photos">
            <li v-for="(photo, index) in photos" :key="photo.id" class="photo" data-tst-id="profile-photo">
              <img class="photo__image" :src="serverFileUrl(photo.url) ?? undefined" alt="" />
              <span v-if="index === 0" class="badge badge--yes photo__main">Main</span>

              <span class="photo__actions">
                <button
                  v-if="index > 0"
                  class="btn btn--ghost btn--small"
                  type="button"
                  :disabled="photoBusy"
                  data-tst-id="profile-photo-main"
                  @click="makeMain(photo)"
                >
                  Make main
                </button>
                <button
                  class="btn btn--danger btn--small"
                  type="button"
                  :disabled="photoBusy"
                  :aria-label="'Remove photo ' + (index + 1)"
                  data-tst-id="profile-photo-remove"
                  @click="removePhoto(photo)"
                >
                  Remove
                </button>
              </span>
            </li>

            <li v-if="canAddPhoto" class="photo photo--add">
              <!-- The real control is the hidden file input; the button opens it. -->
              <input
                ref="fileInput"
                class="photo__file"
                type="file"
                accept="image/jpeg,image/png"
                aria-label="Choose a photo"
                data-tst-id="profile-photo-file"
                @change="onFileChosen"
              />
              <button
                class="photo__add"
                type="button"
                :disabled="photoBusy"
                data-tst-id="profile-photo-add"
                @click="fileInput?.click()"
              >
                <span class="photo__plus" aria-hidden="true">+</span>
                {{ photoBusy ? 'Uploading…' : 'Add photo' }}
              </button>
            </li>
          </ul>

          <p class="field__hint photos__rules">
            JPEG or PNG, up to 6 MB. The first photo is the one shown next to your name.
            <template v-if="!canAddPhoto">
              Your plan holds {{ maxPhotos }} photos; remove one to add another.
            </template>
          </p>
          <p v-if="photoError !== ''" class="form-error photos__error" role="alert" data-tst-id="profile-photo-error">
            {{ photoError }}
          </p>
        </div>
      </section>

      <form data-tst-id="profile-form" @submit.prevent="save">
        <!-- ---------------------------------------------------------- about -->
        <section class="section">
          <h2 class="section__title">About you</h2>

          <div class="card stack">
            <div class="pair">
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
              </label>

              <label class="field">
                <span class="field__label">Pronouns</span>
                <input
                  v-model="form.pronouns"
                  class="input"
                  type="text"
                  maxlength="40"
                  placeholder="she/her, he/him, they/them…"
                  data-tst-id="profile-pronouns"
                />
              </label>
            </div>

            <div class="pair">
              <label class="field">
                <span class="field__label">Lives in</span>
                <input v-model="form.city" class="input" type="text" maxlength="100" data-tst-id="profile-city" />
              </label>

              <label class="field">
                <span class="field__label">From</span>
                <input v-model="form.hometown" class="input" type="text" maxlength="100" data-tst-id="profile-hometown" />
              </label>
            </div>

            <div class="pair">
              <label class="field">
                <span class="field__label">What you do</span>
                <input
                  v-model="form.occupation"
                  class="input"
                  type="text"
                  maxlength="120"
                  placeholder="Job, trade, student…"
                  data-tst-id="profile-occupation"
                />
              </label>

              <label class="field">
                <span class="field__label">Education</span>
                <input v-model="form.education" class="input" type="text" maxlength="120" data-tst-id="profile-education" />
              </label>
            </div>

            <div class="pair">
              <label class="field">
                <span class="field__label">Languages</span>
                <input
                  v-model="form.languages"
                  class="input"
                  type="text"
                  maxlength="200"
                  placeholder="English, Kazakh…"
                  data-tst-id="profile-languages"
                />
              </label>

              <label class="field">
                <span class="field__label">Date of birth</span>
                <input v-model="form.birthDate" class="input" type="date" data-tst-id="profile-birth-date" />
                <span class="field__hint">Others see only your age.</span>
              </label>
            </div>

            <label class="field">
              <span class="field__label">A few words</span>
              <textarea
                v-model="form.bio"
                class="input"
                maxlength="1000"
                placeholder="What you like to do with friends"
                data-tst-id="profile-bio"
              ></textarea>
            </label>
          </div>
        </section>

        <!-- ---------------------------------------------------------- interests -->
        <section class="section">
          <h2 class="section__title">Interests · {{ form.interests.length }} of {{ MAX_INTERESTS }}</h2>

          <div class="card stack">
            <ul v-if="form.interests.length > 0" class="tags">
              <li v-for="(interest, index) in form.interests" :key="interest" class="chip tags__tag">
                {{ interest }}
                <button
                  class="tags__remove"
                  type="button"
                  :aria-label="'Remove ' + interest"
                  @click="form.interests.splice(index, 1)"
                >
                  ✕
                </button>
              </li>
            </ul>

            <div v-if="form.interests.length < MAX_INTERESTS" class="tags__add">
              <input
                v-model="interestDraft"
                class="input"
                type="text"
                :maxlength="MAX_INTEREST_LENGTH * 4"
                placeholder="Hiking, chess, banya…"
                aria-label="An interest to add"
                data-tst-id="profile-interest"
                @keydown.enter.prevent="addInterest"
              />
              <button class="btn btn--ghost" type="button" data-tst-id="profile-interest-add" @click="addInterest">
                Add
              </button>
            </div>
          </div>
        </section>

        <!-- ---------------------------------------------------------- prompts -->
        <section class="section">
          <h2 class="section__title">Prompts · {{ form.prompts.length }} of {{ MAX_PROMPTS }}</h2>

          <div class="stack">
            <div v-for="(prompt, index) in form.prompts" :key="index" class="card stack" data-tst-id="profile-prompt">
              <label class="field">
                <span class="field__label">Question</span>
                <!-- A list to pick from, and free to type one's own. -->
                <input
                  v-model="prompt.question"
                  class="input"
                  type="text"
                  maxlength="120"
                  list="prompt-questions"
                  placeholder="Pick one or write your own"
                  :data-tst-id="'profile-prompt-question-' + index"
                />
              </label>

              <label class="field">
                <span class="field__label">Your answer</span>
                <textarea
                  v-model="prompt.answer"
                  class="input"
                  maxlength="300"
                  :data-tst-id="'profile-prompt-answer-' + index"
                ></textarea>
              </label>

              <div>
                <button class="btn btn--danger btn--small" type="button" @click="form.prompts.splice(index, 1)">
                  Remove this prompt
                </button>
              </div>
            </div>

            <datalist id="prompt-questions">
              <option v-for="question in PROMPT_QUESTIONS" :key="question" :value="question"></option>
            </datalist>

            <div v-if="form.prompts.length < MAX_PROMPTS">
              <button class="btn btn--ghost" type="button" data-tst-id="profile-prompt-add" @click="addPrompt">
                + Add a prompt
              </button>
            </div>
          </div>
        </section>

        <p v-if="error !== ''" class="form-error section" role="alert">{{ error }}</p>

        <div class="section">
          <button class="btn btn--big" type="submit" :disabled="busy" data-tst-id="profile-save">
            {{ busy ? 'Saving…' : 'Save profile' }}
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

.who__meta {
  margin-top: 10px;
}

/* ---------------------------------------------------------------- photos */

.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.photo {
  position: relative;
  display: grid;
  gap: 8px;
  align-content: start;
}

.photo__image {
  width: 100%;
  aspect-ratio: 3 / 4;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-m);
  background: var(--c-surface-soft);
  object-fit: cover;
}

.photo__main {
  position: absolute;
  top: 8px;
  left: 8px;
}

.photo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Hidden from sight, still reachable by assistive technology through the button next to it. */
.photo__file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.photo__add {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  width: 100%;
  aspect-ratio: 3 / 4;
  border: 1px dashed var(--c-line);
  border-radius: var(--radius-m);
  background: transparent;
  color: var(--c-ink-soft);
  font-weight: 600;
  cursor: pointer;
}

.photo__add:hover:not(:disabled) {
  border-color: var(--c-accent);
  color: var(--c-accent);
}

.photo__plus {
  font-size: 2rem;
  line-height: 1;
}

.photos__rules {
  margin-top: 12px;
}

.photos__error {
  margin-top: 10px;
}

/* ---------------------------------------------------------------- form */

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tags__tag {
  padding-right: 6px;
}

.tags__remove {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-ink-faint);
  font-size: 0.75rem;
  cursor: pointer;
}

.tags__remove:hover {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.tags__add {
  display: flex;
  gap: 10px;
}

@media (max-width: 520px) {
  .pair {
    grid-template-columns: 1fr;
  }
}
</style>
