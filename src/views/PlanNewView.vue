<script setup lang="ts">
// The invitation form. Choosing a type fills it in; the user changes what they want, ticks the
// friends and sends. Beside the form, on a wide screen, stands the invitation as the guests will
// see it - built here from what is typed, nothing is asked from the server for it.

import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type { EventTypeCode, EventTypeInfo, EventVisibility, Friend } from '@/api/types'
import { Clock, MapPin, Plus, Wallet, X } from 'lucide-vue-next'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { dateTime, distanceRange, EVENT_TYPE_LOOK, localInputToIso, priceRange } from '@/lib/format'
import { auth } from '@/stores/auth'
import { errorText, toastError, toastOk } from '@/stores/toast'

const route = useRoute()
const router = useRouter()

const types = ref<EventTypeInfo[]>([])
const friends = ref<Friend[]>([])
const loading = ref<boolean>(true)
const busy = ref<boolean>(false)
const error = ref<string>('')
/** Which pair of fields the error is about, to mark it red; null when it came from the server. */
const errorField = ref<'distance' | 'price' | null>(null)

const chosen = ref<EventTypeCode | null>(null)

const form = reactive({
  title: '',
  description: '',
  distanceMinMi: 0,
  distanceMaxMi: 0,
  priceMin: 0,
  priceMax: 0,
  /** Proposed dates as values of <input type="datetime-local">; an empty one is ignored. */
  times: [''] as string[],
  inviteeIds: [] as number[],
  // "Invite everyone" on the feed opens this form already set to public (?public=1).
  visibility: (route.query.public === '1' ? 'PUBLIC' : 'PRIVATE') as EventVisibility,
})

/** The server accepts at most this many proposed dates. */
const MAX_TIMES = 10

// Nobody has to be ticked: the plan can be shared by its link afterwards.
const canSend = computed<boolean>(() => chosen.value !== null && !busy.value)

/** The dates typed so far, as the guests will read them. Empty and unfinished ones are left out. */
const previewTimes = computed<string[]>(() =>
  form.times
    .map(localInputToIso)
    .filter((iso): iso is string => iso !== null)
    .map(dateTime),
)

/** The name the invitation is signed with; the profile may still be loading right after a reload. */
const myName = computed<string>(() => auth.state.profile?.displayName ?? '')

const sendLabel = computed<string>(() =>
  form.visibility === 'PUBLIC'
    ? 'Post to the feed'
    : form.inviteeIds.length === 0
      ? 'Create and get the link'
      : 'Send invitation',
)

onMounted(async () => {
  try {
    const [typeList, friendList] = await Promise.all([api.eventTypes(), api.friends()])
    types.value = typeList
    friends.value = friendList
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
})

/** The "pre-filled" part: the type brings its title, distance and budget. */
function choose(type: EventTypeInfo): void {
  chosen.value = type.eventType
  form.title = type.defaultTitle
  form.distanceMinMi = type.defaultDistanceMinMi
  form.distanceMaxMi = type.defaultDistanceMaxMi
  form.priceMin = type.defaultPriceMin
  form.priceMax = type.defaultPriceMax
  error.value = ''
  errorField.value = null
}

function toggle(userId: number): void {
  const index: number = form.inviteeIds.indexOf(userId)
  if (index >= 0) {
    form.inviteeIds.splice(index, 1)
  } else {
    form.inviteeIds.push(userId)
  }
}

async function send(): Promise<void> {
  if (chosen.value === null) {
    return
  }
  if (form.distanceMinMi > form.distanceMaxMi) {
    error.value = 'The shortest distance is greater than the longest.'
    errorField.value = 'distance'
    return
  }
  if (form.priceMin > form.priceMax) {
    error.value = 'The lowest price is greater than the highest.'
    errorField.value = 'price'
    return
  }

  error.value = ''
  errorField.value = null
  busy.value = true
  try {
    const event = await api.createEvent({
      eventType: chosen.value,
      title: form.title,
      description: form.description.trim() === '' ? null : form.description.trim(),
      distanceMinMi: form.distanceMinMi,
      distanceMaxMi: form.distanceMaxMi,
      priceMin: form.priceMin,
      priceMax: form.priceMax,
      proposedTimes: form.times
        .map(localInputToIso)
        .filter((iso): iso is string => iso !== null),
      // The dates above are typed in the time of this browser; say which, so a reminder can show
      // the same clock time to everyone.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      visibility: form.visibility,
      inviteeIds: form.inviteeIds,
    })

    toastOk(
      form.visibility === 'PUBLIC'
        ? 'Posted to the feed'
        : form.inviteeIds.length === 0
          ? 'Created. Now share the link.'
          : form.inviteeIds.length === 1
            ? 'Invitation sent'
            : 'Invitations sent',
    )
    await router.replace({ name: 'plan', params: { eventId: event.id } })
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="app-col app-col--wide">
    <div class="app-head">
      <h1 class="app-head__title">New plan</h1>
    </div>

    <p v-if="loading" class="hg-soft">Loading…</p>

    <div v-else class="new">
      <form class="new__form" data-tst-id="plan-new-form" @submit.prevent="send">
        <!-- ---------------------------------------------------------- what -->
        <section>
          <h2 class="new__title">What</h2>

          <div class="new__types">
            <button
              v-for="type in types"
              :key="type.eventType"
              class="new__type"
              type="button"
              :aria-pressed="chosen === type.eventType"
              :data-tst-id="'plan-new-type-' + type.eventType"
              @click="choose(type)"
            >
              <EventTypeIcon :type="type.eventType" />
              <span class="new__type-label">{{ EVENT_TYPE_LOOK[type.eventType].label }}</span>
            </button>
          </div>

          <p v-if="chosen !== null" class="new__hint new__hint--below">Filled in for you - change anything.</p>
        </section>

        <template v-if="chosen !== null">
          <!-- -------------------------------------------------------- title and note -->
          <section class="app-stack">
            <label class="hg-field">
              <span class="hg-field__label">Title</span>
              <input
                v-model.trim="form.title"
                class="hg-input"
                type="text"
                maxlength="200"
                required
                data-tst-id="plan-new-title"
              />
            </label>

            <label class="hg-field">
              <span class="hg-field__label">Note</span>
              <textarea
                v-model="form.description"
                class="hg-textarea"
                maxlength="2000"
                placeholder="Anything the guests should know. Optional."
                data-tst-id="plan-new-note"
              ></textarea>
            </label>
          </section>

          <!-- -------------------------------------------------------- when -->
          <section>
            <h2 class="new__title new__title--tight">When</h2>
            <p class="new__hint new__hint--above">
              Offer several and let people choose. Leave empty to agree on the time in the chat.
            </p>

            <div class="app-stack app-stack--tight">
              <div v-for="(_, index) in form.times" :key="index" class="new__time">
                <input
                  v-model="form.times[index]"
                  class="hg-input hg-num"
                  type="datetime-local"
                  :aria-label="'Date and time ' + (index + 1)"
                  :data-tst-id="'plan-new-when-' + index"
                />
                <button
                  v-if="form.times.length > 1"
                  class="hg-iconbtn"
                  type="button"
                  :aria-label="'Remove date ' + (index + 1)"
                  title="Remove this date"
                  @click="form.times.splice(index, 1)"
                >
                  <X class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              v-if="form.times.length < MAX_TIMES"
              class="hg-btn hg-btn--quiet new__time-add"
              type="button"
              data-tst-id="plan-new-when-add"
              @click="form.times.push('')"
            >
              <Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              <span>Add another date</span>
            </button>
          </section>

          <!-- -------------------------------------------------------- how far, how much -->
          <section class="new__pair">
            <div
              class="hg-field"
              :class="{ 'hg-field--error': errorField === 'distance' }"
              role="group"
              aria-label="How far, miles"
            >
              <span class="hg-field__label">How far, miles</span>
              <div class="new__range">
                <input
                  v-model.number="form.distanceMinMi"
                  class="hg-input hg-num"
                  type="number"
                  min="0"
                  max="1000"
                  required
                  aria-label="From, miles"
                  data-tst-id="plan-new-distance-min"
                />
                <span class="hg-soft">to</span>
                <input
                  v-model.number="form.distanceMaxMi"
                  class="hg-input hg-num"
                  type="number"
                  min="0"
                  max="1000"
                  required
                  aria-label="To, miles"
                  data-tst-id="plan-new-distance-max"
                />
              </div>
              <p class="hg-field__msg">{{ distanceRange(form.distanceMinMi, form.distanceMaxMi) }}</p>
            </div>

            <div
              class="hg-field"
              :class="{ 'hg-field--error': errorField === 'price' }"
              role="group"
              aria-label="How much, per person"
            >
              <span class="hg-field__label">How much, per person</span>
              <div class="new__range">
                <input
                  v-model.number="form.priceMin"
                  class="hg-input hg-num"
                  type="number"
                  min="0"
                  step="100"
                  required
                  aria-label="From, per person"
                  data-tst-id="plan-new-price-min"
                />
                <span class="hg-soft">to</span>
                <input
                  v-model.number="form.priceMax"
                  class="hg-input hg-num"
                  type="number"
                  min="0"
                  step="100"
                  required
                  aria-label="To, per person"
                  data-tst-id="plan-new-price-max"
                />
              </div>
              <p class="hg-field__msg">{{ priceRange(form.priceMin, form.priceMax) }}</p>
            </div>
          </section>

          <!-- -------------------------------------------------------- who -->
          <section>
            <h2 class="new__title">Who</h2>

            <!-- Only the invited, or everyone: a public plan is shown in the feed. -->
            <div class="hg-seg new__seg" role="radiogroup" aria-label="Who">
              <button
                class="hg-seg__opt"
                type="button"
                role="radio"
                :aria-checked="form.visibility === 'PRIVATE'"
                data-tst-id="plan-new-private"
                @click="form.visibility = 'PRIVATE'"
              >
                Only people I invite
              </button>
              <button
                class="hg-seg__opt"
                type="button"
                role="radio"
                :aria-checked="form.visibility === 'PUBLIC'"
                data-tst-id="plan-new-public"
                @click="form.visibility = 'PUBLIC'"
              >
                Everyone
              </button>
            </div>

            <div v-if="friends.length > 0" class="new__friends">
              <label v-for="friend in friends" :key="friend.userId" class="hg-row hg-row--link">
                <input
                  class="new__check"
                  type="checkbox"
                  :checked="form.inviteeIds.includes(friend.userId)"
                  :data-tst-id="'plan-new-friend-' + friend.userId"
                  @change="toggle(friend.userId)"
                />
                <UserAvatar
                  :name="friend.displayName"
                  :user-id="friend.userId"
                  :avatar-url="friend.avatarUrl"
                  :size="32"
                />
                <span class="hg-row__text">
                  <span class="hg-row__title">{{ friend.displayName }}</span>
                  <span v-if="friend.city" class="hg-row__sub">{{ friend.city }}</span>
                </span>
              </label>
            </div>

            <p class="new__hint new__hint--below" data-tst-id="plan-new-link-hint">
              <template v-if="form.visibility === 'PUBLIC'">
                Shown in the feed: anyone can join and enters the group chat, and you can remove a guest.
                <template v-if="friends.length > 0">Friends you tick get the invitation directly.</template>
              </template>
              <template v-else-if="friends.length === 0">
                You have no friends here yet. After creating the plan you will get a link to send to
                anyone.
              </template>
              <template v-else>You will also get a link to send to anyone.</template>
            </p>
          </section>

          <!-- One block for every error, from the form or from the server; a pair of fields the
               error is about is also outlined in red. -->
          <p v-if="error !== ''" class="app-error" role="alert" data-tst-id="plan-new-error">{{ error }}</p>

          <div class="new__actions">
            <button
              class="hg-btn hg-btn--primary new__send"
              :class="{ 'is-loading': busy }"
              type="submit"
              :disabled="!canSend"
              data-tst-id="plan-new-send"
            >
              <span>{{ sendLabel }}</span>
            </button>
            <RouterLink class="hg-btn hg-btn--quiet" :to="{ name: 'plans' }">Cancel</RouterLink>
          </div>
        </template>

        <div v-else class="new__actions">
          <RouterLink class="hg-btn hg-btn--quiet" :to="{ name: 'plans' }">Cancel</RouterLink>
        </div>
      </form>

      <!-- The invitation as a guest will see it. A picture only: nothing in it can be pressed. -->
      <aside v-if="chosen !== null" class="new__preview" aria-label="Preview of the invitation">
        <p class="new__preview-caption">This is what they will see.</p>

        <div class="hg-card new__preview-card">
          <div class="app-row">
            <UserAvatar :name="myName" :avatar-url="auth.state.profile?.avatarUrl" />
            <p>
              <b>{{ myName }}</b> invites you
            </p>
          </div>

          <span class="hg-plan__kind">
            <EventTypeIcon :type="chosen" :size="16" />
            {{ EVENT_TYPE_LOOK[chosen].label }}
          </span>

          <h2 class="new__preview-title">{{ form.title === '' ? EVENT_TYPE_LOOK[chosen].label : form.title }}</h2>

          <p v-if="form.description.trim() !== ''" class="hg-plan__note new__preview-note">
            {{ form.description.trim() }}
          </p>

          <ul class="hg-plan__facts new__preview-facts">
            <li v-for="(time, index) in previewTimes" :key="index" class="hg-plan__fact">
              <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              {{ time }}
            </li>
            <li v-if="previewTimes.length === 0" class="hg-plan__fact">
              <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              Time to be agreed
            </li>
            <li class="hg-plan__fact">
              <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              {{ distanceRange(form.distanceMinMi, form.distanceMaxMi) }}
            </li>
            <li class="hg-plan__fact">
              <Wallet class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
              {{ priceRange(form.priceMin, form.priceMax) }}
            </li>
          </ul>

          <span class="hg-btn hg-btn--primary hg-btn--block new__preview-button" aria-hidden="true">
            I'm coming
          </span>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* The form and, beside it, the preview. The form never grows wider than a comfortable line. */
.new {
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(0, 1fr);
  align-items: start;
  gap: var(--s-7);
}

.new__form {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  min-width: 0;
}

.new__title {
  margin-bottom: var(--s-3);
  font: var(--t-title-3);
}

.new__title--tight {
  margin-bottom: var(--s-1);
}

.new__hint {
  font: var(--t-small);
  color: var(--c-ink-soft);
}

.new__hint--above {
  margin-bottom: var(--s-3);
}

.new__hint--below {
  margin-top: var(--s-3);
}

/* ---- the activity tiles ---- */
.new__types {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-2);
}

.new__type {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--s-1);
  min-width: 0;
  height: 72px;
  padding: 0 var(--s-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-m);
  background: var(--c-surface);
  color: var(--c-ink);
  font: var(--t-body-strong);
  cursor: pointer;
  transition: background-color var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease);
}

.new__type:hover {
  border-color: var(--c-ink-faint);
}

.new__type[aria-pressed='true'] {
  border-color: var(--c-ink);
  background: var(--c-ink);
  color: var(--c-on-ink);
}

.new__type-label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- dates ---- */
.new__time {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.new__time-add {
  margin-top: var(--s-2);
}

/* ---- distance and budget ---- */
.new__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
}

.new__range {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

/* ---- who ---- */
.new__seg {
  max-width: 100%;
}

.new__friends {
  margin-top: var(--s-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-m);
  overflow: hidden;
}

.new__check {
  flex: none;
  width: 20px;
  height: 20px;
  accent-color: var(--c-accent);
}

.new__actions {
  display: flex;
  gap: var(--s-2);
}

/* ---- the preview ---- */
.new__preview {
  position: sticky;
  top: var(--s-6);
  min-width: 0;
  max-width: 400px;
}

.new__preview-caption {
  margin-bottom: var(--s-3);
  font: var(--t-caption);
  color: var(--c-ink-soft);
}

.new__preview-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-5);
  border-radius: var(--r-l);
}

.new__preview-title {
  font: var(--t-title-2);
  overflow-wrap: anywhere;
}

/* The note keeps the line breaks the author typed. */
.new__preview-note {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.new__preview-facts {
  font: var(--t-small);
}

/* It only looks like a button: the preview is a picture. */
.new__preview-button {
  cursor: default;
  pointer-events: none;
}

@media (max-width: 1279px) {
  .new {
    gap: var(--s-6);
  }
}

/* Below 1024 there is no room beside the form: one column, no preview. */
@media (max-width: 1023px) {
  .new {
    grid-template-columns: minmax(0, 560px);
  }

  .new__preview {
    display: none;
  }
}

@media (max-width: 560px) {
  .new__pair {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s-4);
  }

  .new__seg {
    display: flex;
  }

  .new__seg .hg-seg__opt {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 var(--s-2);
  }

  .new__actions {
    flex-direction: column;
  }

  .new__send {
    width: 100%;
  }
}
</style>
