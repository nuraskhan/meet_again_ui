<script setup lang="ts">
// The user's own profile: photos at the left, what they say about themselves at the right (about,
// facts, interests, prompts), and the quiet account block with the way out. What others see of it is
// PersonView.

import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import { serverFileUrl } from '@/api/http'
import type { Photo, Prompt } from '@/api/types'
import { LogOut, Plus, Star, Trash2, X } from 'lucide-vue-next'
import { auth } from '@/stores/auth'
import { errorText, toastError, toastOk } from '@/stores/toast'

// ------------------------------------------------------------------ limits (the server enforces the same)

const MAX_INTERESTS = 10
const MAX_INTEREST_LENGTH = 30
const MAX_PROMPTS = 3
const MAX_BIO_LENGTH = 1000

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

/**
 * The form as it was last taken from the server, as text: comparing with it tells whether there is
 * anything to save.
 */
const savedForm = ref<string>('')

/** Something is typed that the server does not have yet - an interest not added yet counts too. */
const dirty = computed<boolean>(
  () => JSON.stringify(form) !== savedForm.value || interestDraft.value.trim() !== '',
)

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
  savedForm.value = JSON.stringify(form)
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
/** The change in progress is an upload: a busy tile stands where the new photo will appear. */
const uploading = ref<boolean>(false)
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

  uploading.value = true
  try {
    await changePhotos(() => api.uploadPhoto(file), 'Photo added')
  } finally {
    uploading.value = false
  }
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
  <div class="app-col app-col--wide">
    <div class="app-head">
      <h1 class="app-head__title">My profile</h1>
    </div>

    <div v-if="loading" class="profile" aria-busy="true">
      <div class="profile__photos">
        <span class="hg-photo hg-photo--portrait hg-skel"></span>
      </div>
      <div class="profile__main">
        <span class="hg-skel profile__skel-title"></span>
        <span class="hg-skel profile__skel-field"></span>
        <span class="hg-skel profile__skel-field"></span>
        <span class="hg-skel profile__skel-area"></span>
      </div>
    </div>

    <div v-else class="profile">
      <!-- ------------------------------------------------------------ photos -->
      <aside class="profile__photos" aria-label="Photos">
        <ul class="profile__tiles">
          <li
            v-for="(photo, index) in photos"
            :key="photo.id"
            class="profile__tile hg-photo hg-photo--portrait"
            data-tst-id="profile-photo"
          >
            <img :src="serverFileUrl(photo.url) ?? undefined" alt="" />
            <span v-if="index === 0" class="hg-photo__top">
              <span class="hg-photo__chip">Main</span>
            </span>

            <span class="hg-photo__shade profile__tile-actions">
              <button
                v-if="index > 0"
                class="hg-iconbtn hg-iconbtn--on-photo"
                type="button"
                :disabled="photoBusy"
                :aria-label="'Make photo ' + (index + 1) + ' the main one'"
                title="Make main"
                data-tst-id="profile-photo-main"
                @click="makeMain(photo)"
              >
                <Star class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              </button>
              <button
                class="hg-iconbtn hg-iconbtn--on-photo"
                type="button"
                :disabled="photoBusy"
                :aria-label="'Remove photo ' + (index + 1)"
                title="Remove"
                data-tst-id="profile-photo-remove"
                @click="removePhoto(photo)"
              >
                <Trash2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              </button>
            </span>
          </li>

          <!-- The HTTP layer reports no upload progress, so the tile is only shown as busy. -->
          <li v-if="uploading" class="profile__tile hg-photo hg-photo--portrait" role="status">
            <span class="hg-skel profile__tile-busy"></span>
            <span class="hg-sr">Uploading the photo…</span>
          </li>

          <li v-if="canAddPhoto" class="profile__tile">
            <!-- The real control is the hidden file input; the button opens it. -->
            <input
              ref="fileInput"
              class="hg-sr"
              type="file"
              accept="image/jpeg,image/png"
              tabindex="-1"
              aria-label="Choose a photo"
              data-tst-id="profile-photo-file"
              @change="onFileChosen"
            />
            <button
              class="hg-photo hg-photo--portrait profile__add"
              type="button"
              :disabled="photoBusy"
              data-tst-id="profile-photo-add"
              @click="fileInput?.click()"
            >
              <span class="profile__add-label">
                <Plus class="hg-icon hg-icon--24" :stroke-width="1.5" aria-hidden="true" />
                {{ uploading ? 'Uploading…' : 'Add a photo' }}
              </span>
            </button>
          </li>
        </ul>

        <p class="hg-num">{{ photos.length }} of {{ maxPhotos }} photos</p>
        <p class="profile__hint">
          JPEG or PNG, up to 6 MB each. The main photo is the one shown next to your name.
          <template v-if="!canAddPhoto">
            Your plan holds {{ maxPhotos }} photos; remove one to add another.
          </template>
        </p>
        <p v-if="photoError !== ''" class="app-error" role="alert" data-tst-id="profile-photo-error">
          {{ photoError }}
        </p>
      </aside>

      <div class="profile__main">
        <form class="profile__form" data-tst-id="profile-form" @submit.prevent="save">
          <!-- -------------------------------------------------------- about -->
          <section class="profile__section">
            <h2 class="profile__section-title">About you</h2>

            <div class="profile__pair">
              <label class="hg-field">
                <span class="hg-field__label">Name</span>
                <input
                  v-model.trim="form.displayName"
                  class="hg-input"
                  type="text"
                  maxlength="100"
                  required
                  autocomplete="name"
                  data-tst-id="profile-name"
                />
              </label>

              <label class="hg-field">
                <span class="hg-field__label">Pronouns</span>
                <input
                  v-model="form.pronouns"
                  class="hg-input"
                  type="text"
                  maxlength="40"
                  placeholder="she/her, he/him, they/them…"
                  data-tst-id="profile-pronouns"
                />
              </label>

              <label class="hg-field">
                <span class="hg-field__label">Date of birth</span>
                <input v-model="form.birthDate" class="hg-input" type="date" data-tst-id="profile-birth-date" />
                <span class="hg-field__msg">Others see only your age.</span>
              </label>
            </div>

            <div class="hg-field">
              <label class="hg-field__label" for="profile-bio">About</label>
              <textarea
                id="profile-bio"
                v-model="form.bio"
                class="hg-textarea"
                :maxlength="MAX_BIO_LENGTH"
                placeholder="What you like to do with friends"
                data-tst-id="profile-bio"
              ></textarea>
              <p class="hg-field__msg">
                <span class="hg-field__counter">{{ form.bio.length }} / {{ MAX_BIO_LENGTH }}</span>
              </p>
            </div>
          </section>

          <!-- -------------------------------------------------------- facts -->
          <section class="profile__section">
            <h2 class="profile__section-title">Facts</h2>

            <div class="profile__pair">
              <label class="hg-field">
                <span class="hg-field__label">City</span>
                <input v-model="form.city" class="hg-input" type="text" maxlength="100" data-tst-id="profile-city" />
              </label>

              <label class="hg-field">
                <span class="hg-field__label">Hometown</span>
                <input
                  v-model="form.hometown"
                  class="hg-input"
                  type="text"
                  maxlength="100"
                  data-tst-id="profile-hometown"
                />
              </label>

              <label class="hg-field">
                <span class="hg-field__label">Occupation</span>
                <input
                  v-model="form.occupation"
                  class="hg-input"
                  type="text"
                  maxlength="120"
                  placeholder="Job, trade, student…"
                  data-tst-id="profile-occupation"
                />
              </label>

              <label class="hg-field">
                <span class="hg-field__label">Education</span>
                <input
                  v-model="form.education"
                  class="hg-input"
                  type="text"
                  maxlength="120"
                  data-tst-id="profile-education"
                />
              </label>

              <label class="hg-field">
                <span class="hg-field__label">Languages</span>
                <input
                  v-model="form.languages"
                  class="hg-input"
                  type="text"
                  maxlength="200"
                  placeholder="English, Kazakh…"
                  data-tst-id="profile-languages"
                />
              </label>
            </div>
          </section>

          <!-- -------------------------------------------------------- interests -->
          <section class="profile__section">
            <h2 class="profile__section-title">
              Interests
              <span class="profile__count hg-num">{{ form.interests.length }} of {{ MAX_INTERESTS }}</span>
            </h2>

            <ul v-if="form.interests.length > 0" class="profile__chips">
              <li v-for="(interest, index) in form.interests" :key="interest" class="hg-chip hg-chip--removable">
                {{ interest }}
                <button
                  class="hg-chip__remove"
                  type="button"
                  :aria-label="'Remove ' + interest"
                  @click="form.interests.splice(index, 1)"
                >
                  <X class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                </button>
              </li>
            </ul>

            <div v-if="form.interests.length < MAX_INTERESTS" class="hg-field">
              <label class="hg-field__label" for="profile-interest">Add an interest</label>
              <div class="profile__interest-add">
                <input
                  id="profile-interest"
                  v-model="interestDraft"
                  class="hg-input"
                  type="text"
                  :maxlength="MAX_INTEREST_LENGTH * 4"
                  placeholder="Type and press Enter"
                  data-tst-id="profile-interest"
                  @keydown.enter.prevent="addInterest"
                />
                <button
                  class="hg-btn hg-btn--outline"
                  type="button"
                  :disabled="interestDraft.trim() === ''"
                  data-tst-id="profile-interest-add"
                  @click="addInterest"
                >
                  <span>Add</span>
                </button>
              </div>
              <p class="hg-field__msg">Commas separate several: hiking, chess, banya.</p>
            </div>
          </section>

          <!-- -------------------------------------------------------- prompts -->
          <section class="profile__section">
            <h2 class="profile__section-title">
              Prompts
              <span class="profile__count hg-num">{{ form.prompts.length }} of {{ MAX_PROMPTS }}</span>
            </h2>

            <div
              v-for="(prompt, index) in form.prompts"
              :key="index"
              class="hg-card profile__prompt"
              data-tst-id="profile-prompt"
            >
              <div class="profile__prompt-head">
                <label class="hg-field app-grow">
                  <span class="hg-field__label">Question</span>
                  <!-- A list to pick from, and free to type one's own. -->
                  <input
                    v-model="prompt.question"
                    class="hg-input"
                    type="text"
                    maxlength="120"
                    list="prompt-questions"
                    placeholder="Pick one or write your own"
                    :data-tst-id="'profile-prompt-question-' + index"
                  />
                </label>
                <button
                  class="hg-iconbtn"
                  type="button"
                  aria-label="Remove this prompt"
                  title="Remove this prompt"
                  @click="form.prompts.splice(index, 1)"
                >
                  <Trash2 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                </button>
              </div>

              <label class="hg-field">
                <span class="hg-field__label">Answer</span>
                <textarea
                  v-model="prompt.answer"
                  class="hg-textarea profile__answer"
                  maxlength="300"
                  :data-tst-id="'profile-prompt-answer-' + index"
                ></textarea>
              </label>
            </div>

            <datalist id="prompt-questions">
              <option v-for="question in PROMPT_QUESTIONS" :key="question" :value="question"></option>
            </datalist>

            <div v-if="form.prompts.length < MAX_PROMPTS">
              <button class="hg-btn hg-btn--quiet" type="button" data-tst-id="profile-prompt-add" @click="addPrompt">
                <Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <span>Add a prompt</span>
              </button>
            </div>
          </section>

          <p v-if="error !== ''" class="app-error" role="alert">{{ error }}</p>

          <!-- -------------------------------------------------------- the save bar -->
          <div class="profile__bar">
            <span class="profile__bar-state">
              {{ dirty ? 'You have unsaved changes.' : 'Everything is saved.' }}
            </span>
            <RouterLink
              v-if="auth.state.userId !== null"
              class="hg-btn hg-btn--outline"
              :to="{ name: 'person', params: { userId: auth.state.userId } }"
              data-tst-id="profile-preview"
            >
              See how others see it
            </RouterLink>
            <button
              class="hg-btn hg-btn--primary"
              :class="{ 'is-loading': busy }"
              type="submit"
              :disabled="busy || !dirty"
              data-tst-id="profile-save"
            >
              <span>Save</span>
            </button>
          </div>
        </form>

        <!-- ---------------------------------------------------------- account -->
        <section class="hg-card profile__account">
          <h2 class="hg-card__title">Account</h2>
          <p class="profile__account-line">
            <span class="profile__email" data-tst-id="profile-email">{{ auth.state.profile?.email }}</span>
            <span v-if="auth.state.profile?.emailVerified" class="hg-badge hg-badge--success">Confirmed</span>
            <span v-else class="hg-badge hg-badge--warning">Not confirmed</span>
          </p>
          <p class="profile__account-line">
            <span class="hg-badge" data-tst-id="profile-privilege">
              {{ PRIVILEGE_NAME[auth.state.profile?.privilege ?? 'STANDARD'] }}
            </span>
            <span class="hg-soft hg-num">Up to {{ maxPhotos }} photos</span>
          </p>
          <div>
            <button class="hg-btn hg-btn--outline" type="button" data-tst-id="profile-logout" @click="auth.logout()">
              <LogOut class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Two columns from 1024px: the photos stay in sight while the form scrolls. Narrower - one column,
   the photos a row that scrolls sideways above the form. */
.profile {
  display: grid;
  grid-template-columns: minmax(0, var(--size-list-pane)) minmax(0, 1fr);
  gap: var(--s-7);
  align-items: start;
}

/* ---------------------------------------------------------------- photos */

/* Taller than the window with many photos, so it scrolls by itself: a sticky block taller than
   the window would keep its lower tiles out of reach. The padding keeps focus outlines unclipped. */
.profile__photos {
  position: sticky;
  top: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
  max-height: calc(100vh - var(--s-6) * 2);
  max-height: calc(100dvh - var(--s-6) * 2);
  margin: calc(var(--s-1) * -1);
  padding: var(--s-1);
  overflow-y: auto;
}

.profile__tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-3);
}

.profile__tile {
  position: relative;
  min-width: 0;
}

/* The main photo (or, without photos, the invitation to add one) is the large one. */
.profile__tile:first-child {
  grid-column: 1 / -1;
}

.profile__tile-actions {
  justify-content: flex-end;
  padding: var(--s-5) var(--s-2) var(--s-2);
}

.profile__tile-busy {
  position: absolute;
  inset: 0;
  border-radius: 0;
}

.profile__add {
  display: grid;
  place-items: center;
  width: 100%;
  border: 1px dashed var(--c-ink-faint);
  background: transparent;
  color: var(--c-ink-soft);
  font: var(--t-small);
  cursor: pointer;
  transition: border-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
}

.profile__add:hover:not(:disabled) {
  border-color: var(--c-ink);
  color: var(--c-ink);
}

.profile__add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.profile__add-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
}

.profile__hint {
  font: var(--t-small);
  color: var(--c-ink-soft);
}

/* ---------------------------------------------------------------- form */

.profile__main,
.profile__form {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  min-width: 0;
}

.profile__section {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.profile__section-title {
  font: var(--t-title-2);
}

.profile__count {
  margin-left: var(--s-1);
  font: var(--t-small);
  color: var(--c-ink-soft);
}

.profile__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-4);
}

.profile__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.profile__interest-add {
  display: flex;
  gap: var(--s-2);
}

.profile__prompt {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.profile__prompt-head {
  display: flex;
  align-items: flex-end;
  gap: var(--s-2);
}

.profile__answer {
  min-height: var(--s-8);
}

/* Stays at the bottom of the window while the form is in sight. */
.profile__bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin: 0 calc(var(--s-4) * -1);
  padding: var(--s-4);
  border-radius: var(--r-m);
  background: var(--c-surface);
  box-shadow: var(--shadow-2);
}

.profile__bar-state {
  flex: 1;
  font: var(--t-small);
  color: var(--c-ink-soft);
}

/* ---------------------------------------------------------------- account */

.profile__account {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  border: 0;
  background: var(--c-surface-soft);
}

.profile__account-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.profile__email {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ---------------------------------------------------------------- loading */

.profile__skel-title {
  width: 40%;
  height: var(--s-5);
}

.profile__skel-field {
  height: var(--size-control);
}

.profile__skel-area {
  height: calc(var(--s-8) * 2);
}

/* ---------------------------------------------------------------- narrower windows */

@media (max-width: 1023px) {
  .profile {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s-6);
  }

  .profile__photos {
    position: static;
    max-height: none;
    overflow-y: visible;
  }

  .profile__tiles {
    display: flex;
    align-items: flex-start;
    overflow-x: auto;
    padding: var(--s-1) var(--s-1) var(--s-2);
    margin: calc(var(--s-1) * -1);
    scroll-snap-type: x proximity;
  }

  .profile__tile {
    flex: 0 0 40%;
    max-width: var(--size-sidebar);
    scroll-snap-align: start;
  }
}

@media (max-width: 767px) {
  .profile__pair {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Above the tab bar of the frame, which is fixed to the bottom of the window. */
  .profile__bar {
    bottom: calc(var(--size-tab-bar) + env(safe-area-inset-bottom));
  }

  .profile__bar .hg-btn--primary {
    flex: 1 1 100%;
  }
}
</style>
