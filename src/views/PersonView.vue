<script setup lang="ts">
// A person as others see them: photos, a few facts, interests, prompts. Also how the user sees
// their own profile "from outside".

import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api'
import { ApiError, serverFileUrl } from '@/api/http'
import type { Profile } from '@/api/types'
import UserAvatar from '@/components/UserAvatar.vue'
import { auth } from '@/stores/auth'
import { toastError } from '@/stores/toast'

const props = defineProps<{ userId: number }>()

const person = ref<Profile | null>(null)
const loading = ref<boolean>(true)
const missing = ref<boolean>(false)
/** Which photo is shown large. */
const shown = ref<number>(0)

const isMe = computed<boolean>(() => props.userId === auth.state.userId)

/** "Carpenter · Trade school" - the facts that fit on a line, those that are given. */
const facts = computed<{ icon: string; text: string }[]>(() => {
  const current: Profile | null = person.value
  if (current === null) {
    return []
  }
  const list: { icon: string; text: string }[] = []
  if (current.occupation) list.push({ icon: '💼', text: current.occupation })
  if (current.education) list.push({ icon: '🎓', text: current.education })
  if (current.city) list.push({ icon: '📍', text: 'Lives in ' + current.city })
  if (current.hometown) list.push({ icon: '🏡', text: 'From ' + current.hometown })
  if (current.languages) list.push({ icon: '💬', text: current.languages })
  return list
})

onMounted(load)
watch(() => props.userId, load)

async function load(): Promise<void> {
  loading.value = true
  missing.value = false
  shown.value = 0
  try {
    person.value = await api.profile(props.userId)
  } catch (caught) {
    person.value = null
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    } else {
      toastError(caught)
    }
  } finally {
    loading.value = false
  }
}

function step(by: number): void {
  const count: number = person.value?.photos.length ?? 0
  if (count > 0) {
    shown.value = (shown.value + by + count) % count
  }
}
</script>

<template>
  <main class="page person-page">
    <p v-if="loading && person === null" class="muted">Loading…</p>

    <div v-else-if="missing" class="empty" data-tst-id="person-missing">
      <p>This person is not here.</p>
    </div>

    <template v-else-if="person !== null">
      <article class="card person" data-tst-id="person">
        <!-- ---------------------------------------------------------- photos -->
        <div v-if="person.photos.length > 0" class="gallery">
          <img
            class="gallery__image"
            :src="serverFileUrl(person.photos[shown]?.url) ?? undefined"
            :alt="'Photo ' + (shown + 1) + ' of ' + person.photos.length + ' of ' + person.displayName"
            data-tst-id="person-photo"
          />

          <template v-if="person.photos.length > 1">
            <!-- Which photo of how many, as on a phone: a row of bars at the top. -->
            <div class="gallery__bars" aria-hidden="true">
              <span
                v-for="(photo, index) in person.photos"
                :key="photo.id"
                class="gallery__bar"
                :class="{ 'gallery__bar--on': index === shown }"
              ></span>
            </div>

            <button class="gallery__step gallery__step--back" type="button" aria-label="Previous photo" @click="step(-1)">
              ‹
            </button>
            <button
              class="gallery__step gallery__step--next"
              type="button"
              aria-label="Next photo"
              data-tst-id="person-photo-next"
              @click="step(1)"
            >
              ›
            </button>
          </template>
        </div>

        <div v-else class="person__no-photo">
          <UserAvatar :name="person.displayName" :user-id="person.userId" :size="96" />
        </div>

        <!-- ---------------------------------------------------------- who -->
        <div class="person__body">
          <h1 class="person__name">
            {{ person.displayName }}<span v-if="person.age !== null" class="person__age">, {{ person.age }}</span>
          </h1>

          <p class="row person__tags">
            <span v-if="person.pronouns" class="badge">{{ person.pronouns }}</span>
            <span v-if="person.privilege !== 'STANDARD'" class="badge badge--wait" data-tst-id="person-privilege">
              {{ person.privilege === 'MAX' ? 'Max' : 'Pro' }}
            </span>
          </p>

          <ul v-if="facts.length > 0" class="person__facts">
            <li v-for="fact in facts" :key="fact.text">
              <span aria-hidden="true">{{ fact.icon }}</span> {{ fact.text }}
            </li>
          </ul>

          <p v-if="person.bio" class="person__bio">{{ person.bio }}</p>

          <ul v-if="person.interests.length > 0" class="person__interests" data-tst-id="person-interests">
            <li v-for="interest in person.interests" :key="interest" class="chip">{{ interest }}</li>
          </ul>

          <div v-for="prompt in person.prompts" :key="prompt.question" class="prompt" data-tst-id="person-prompt">
            <p class="prompt__question">{{ prompt.question }}</p>
            <p class="prompt__answer">{{ prompt.answer }}</p>
          </div>

          <p
            v-if="!person.bio && facts.length === 0 && person.interests.length === 0 && person.prompts.length === 0"
            class="muted"
          >
            {{ isMe ? 'You have not said anything about yourself yet.' : 'Has not said anything about themselves yet.' }}
          </p>
        </div>
      </article>

      <p v-if="isMe" class="person-page__edit">
        <RouterLink class="btn btn--ghost" :to="{ name: 'profile' }" data-tst-id="person-edit">Edit my profile</RouterLink>
      </p>
    </template>
  </main>
</template>

<style scoped>
.person-page {
  max-width: 520px;
}

.person {
  padding: 0;
  overflow: hidden;
}

/* ---------------------------------------------------------------- photos */

.gallery {
  position: relative;
  background: var(--c-surface-soft);
}

.gallery__image {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.gallery__bars {
  position: absolute;
  top: 10px;
  right: 12px;
  left: 12px;
  display: flex;
  gap: 4px;
}

.gallery__bar {
  flex: 1 1 0;
  height: 3px;
  border-radius: 2px;
  background: rgb(255 255 255 / 45%); /* over a photo, in both themes */
}

.gallery__bar--on {
  background: #ffffff; /* over a photo, in both themes */
}

.gallery__step {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 40%); /* over a photo, in both themes */
  color: #ffffff; /* over a photo, in both themes */
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
}

.gallery__step:hover {
  background: rgb(0 0 0 / 60%);
}

.gallery__step--back {
  left: 10px;
}

.gallery__step--next {
  right: 10px;
}

.person__no-photo {
  display: grid;
  place-items: center;
  padding: 32px 0 8px;
}

/* ---------------------------------------------------------------- who */

.person__body {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.person__name {
  font-family: var(--font-display);
  font-size: 1.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.person__age {
  font-weight: 400;
}

.person__tags:empty {
  display: none;
}

.person__facts {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--c-ink-soft);
}

.person__bio {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.person__interests {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.prompt {
  padding: 14px 16px;
  border-radius: var(--radius-m);
  background: var(--c-surface-soft);
}

.prompt__question {
  color: var(--c-ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
}

.prompt__answer {
  margin-top: 4px;
  font-family: var(--font-display);
  font-size: 1.2rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.person-page__edit {
  margin-top: 16px;
  text-align: center;
}
</style>
