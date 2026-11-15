<script setup lang="ts">
// The invitation form. Choosing a type fills it in; the user changes what they want, ticks the
// friends and sends. Beside the form, on a wide screen, stands the invitation as the guests will
// see it - built here from what is typed, nothing is asked from the server for it.

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type { EventTypeCode, EventTypeInfo, EventVisibility, Friend, FriendAvailability } from '@/api/types'
import { Check, Clock, LocateFixed, MapPin, Plus, Wallet, X } from 'lucide-vue-next'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { addDays, availabilityPhrase, covers } from '@/lib/dates'
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

// ------------------------------------------------------------------ who is busy on a proposed day

/** The server answers for a window of about 400 days at most; one request covers this many. */
const MARKS_WINDOW_DAYS: number = 366
/** Typing a date passes through unfinished ones: ask only when the typing has paused. */
const MARKS_DELAY_MS: number = 400

/** What friends marked for the proposed days (all friends: ticking one shows their hint at once). */
const friendMarks = ref<FriendAvailability[]>([])

/**
 * The calendar day of each date row; null for an empty or unfinished one.
 * WHY the first ten characters and no Date: the field holds local time ("2030-01-05T18:00"), so
 * its date part IS the day the user means - the same plain day friends mark in their calendars
 * (see lib/dates.ts). Going through a Date and UTC could move it to the neighbour day.
 */
const rowDays = computed<(string | null)[]>(() =>
  form.times.map((value: string) =>
    /^\d{4}-\d{2}-\d{2}T/.test(value) && localInputToIso(value) !== null ? value.slice(0, 10) : null,
  ),
)

/** The distinct proposed days, earliest first, as one text: it changes when a new answer is needed. */
const daysKey = computed<string>(() =>
  [...new Set<string>(rowDays.value.filter((day): day is string => day !== null))].sort().join(','),
)

let marksTimer: number | undefined
/** Counts the requests: an answer for days that are no longer proposed is dropped. */
let marksAsked: number = 0

watch([daysKey, () => friends.value.length], () => {
  window.clearTimeout(marksTimer)
  marksTimer = window.setTimeout(loadFriendMarks, MARKS_DELAY_MS)
})

onBeforeUnmount(() => window.clearTimeout(marksTimer))

async function loadFriendMarks(): Promise<void> {
  const request: number = ++marksAsked
  const days: string[] = daysKey.value === '' ? [] : daysKey.value.split(',')
  const first: string | undefined = days[0]
  const last: string | undefined = days[days.length - 1]
  if (first === undefined || last === undefined || friends.value.length === 0) {
    friendMarks.value = []
    return
  }
  try {
    // Usually the dates are close and one window holds them all; dates more than a year apart
    // are asked day by day, so the window never grows beyond what the server accepts.
    const answers: FriendAvailability[][] =
      addDays(first, MARKS_WINDOW_DAYS) >= last
        ? [await api.friendsAvailability(first, last)]
        : await Promise.all(days.map((day: string) => api.friendsAvailability(day, day)))
    if (request !== marksAsked) {
      return
    }
    // Asked day by day, a long mark comes back once per day: keep one of each.
    const seen = new Set<string>()
    const marks: FriendAvailability[] = []
    for (const mark of answers.flat()) {
      const key: string = [mark.userId, mark.kind, mark.fromDate, mark.toDate].join('|')
      if (!seen.has(key)) {
        seen.add(key)
        marks.push(mark)
      }
    }
    friendMarks.value = marks
  } catch {
    // The hints are a courtesy and nothing waits for them: without an answer the form works as
    // it always did, so a failure here is not worth interrupting the typing with a message.
    if (request === marksAsked) {
      friendMarks.value = []
    }
  }
}

interface BusyHint {
  text: string
  /** A FREE mark: good news, shown as such. */
  free: boolean
}

/** What the ticked friends marked for the day of a date row: who is busy or away first. */
function busyHints(index: number): BusyHint[] {
  const day: string | null = rowDays.value[index] ?? null
  if (day === null) {
    return []
  }
  return friendMarks.value
    .filter((mark) => form.inviteeIds.includes(mark.userId) && covers(mark, day))
    .map(
      (mark): BusyHint => ({
        // "Timur is busy that day", "Dana is in Almaty".
        text:
          mark.displayName +
          ' is ' +
          availabilityPhrase(mark.kind, mark.city) +
          (mark.kind === 'TRIP' ? '' : ' that day'),
        free: mark.kind === 'FREE',
      }),
    )
    .sort((a, b) => Number(a.free) - Number(b.free))
}

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

// ------------------------------------------------------------------ where the person is
//
// Asked here, while the plan is being written, and saved with it: places can then be suggested
// and chosen the moment the plan exists, measured from where its organiser is. Before, the
// location was a separate step on the plan page that came after the places it was needed for.

/** The position of the device, once the person shared it. */
const position = ref<{ latitude: number; longitude: number } | null>(null)
/** The place in the person's own words: instead of the position, or beside it. */
const locationText = ref<string>('')
const locating = ref<boolean>(false)
/** The device gave no position: the person can still type the place. */
const locateFailed = ref<boolean>(false)

/** Asks the device where the person is. The browser asks the person first. */
function locate(): void {
  if (!('geolocation' in navigator)) {
    locateFailed.value = true
    return
  }
  locating.value = true
  locateFailed.value = false
  navigator.geolocation.getCurrentPosition(
    (found) => {
      locating.value = false
      position.value = { latitude: found.coords.latitude, longitude: found.coords.longitude }
    },
    () => {
      locating.value = false
      locateFailed.value = true
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  )
}

// A person who has already allowed this site to see their location is not asked again: the
// position is taken at once. Anyone else is asked only when they press the button.
onMounted(() => {
  if (!('permissions' in navigator)) {
    return
  }
  navigator.permissions
    .query({ name: 'geolocation' })
    .then((status) => {
      if (status.state === 'granted' && position.value === null) {
        locate()
      }
    })
    .catch(() => {
      // The browser cannot say: the button is there.
    })
})

/**
 * Saves where the organiser is, for the plan just created. The radius is the farthest the
 * invitation itself speaks of. A failure here does not undo the plan: the location can be given
 * on the plan page.
 */
async function saveLocation(eventId: number): Promise<void> {
  const text: string = locationText.value.trim()
  if (position.value === null && text === '') {
    return
  }
  try {
    await api.savePreference(eventId, {
      latitude: position.value?.latitude ?? null,
      longitude: position.value?.longitude ?? null,
      locationText: text === '' ? null : text,
      travelRadiusMi: Math.min(500, Math.max(1, form.distanceMaxMi)),
    })
  } catch (caught) {
    // The plan exists; only its location was not kept. Say why, and go on to the plan.
    toastError(caught)
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
    await saveLocation(event.id)
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
              <div v-for="(_, index) in form.times" :key="index">
                <div class="new__time">
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

                <!-- What the ticked friends marked for that day. Only a hint: nothing stops the
                     invitation - the friend may well come anyway. -->
                <p
                  v-if="busyHints(index).length > 0"
                  class="new__busy"
                  aria-live="polite"
                  data-tst-id="plan-new-busy"
                >
                  <template v-for="(hint, position) in busyHints(index)" :key="position">
                    <span v-if="position > 0" aria-hidden="true"> · </span>
                    <span :class="hint.free ? 'new__busy-free' : 'new__busy-taken'">{{ hint.text }}</span>
                  </template>
                </p>
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
              aria-label="How much, per person ($)"
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

          <!-- -------------------------------------------------------- where you are -->
          <section data-tst-id="plan-new-location">
            <h2 class="new__title new__title--tight">Where you are</h2>
            <p class="new__hint new__hint--above">
              Places are suggested near you, and each shows how far it is. Others see only what you type, and
              that a location was shared - never the point itself.
            </p>

            <div class="new__where">
              <button
                class="hg-btn"
                :class="[position === null ? 'hg-btn--neutral' : 'hg-btn--outline', { 'is-loading': locating }]"
                type="button"
                :disabled="locating"
                data-tst-id="plan-new-locate"
                @click="locate"
              >
                <Check v-if="position !== null" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <LocateFixed v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
                <span>{{ position === null ? 'Use my location' : 'Location shared' }}</span>
              </button>
              <button
                v-if="position !== null"
                class="hg-btn hg-btn--quiet"
                type="button"
                data-tst-id="plan-new-unlocate"
                @click="position = null"
              >
                Remove
              </button>
            </div>
            <p v-if="locateFailed" class="hg-field__msg" data-tst-id="plan-new-locate-failed">
              Your browser did not give your location. You can type the place below instead.
            </p>

            <div class="hg-field new__where-text">
              <label class="hg-field__label" for="plan-new-place">Or type where you are coming from</label>
              <input
                id="plan-new-place"
                v-model="locationText"
                class="hg-input"
                type="text"
                maxlength="200"
                placeholder="City, neighbourhood or address"
                data-tst-id="plan-new-place"
              />
              <p class="hg-field__msg">
                A typed place is shown to the others, but distances need the shared location.
              </p>
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

.new__where {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.new__where-text {
  margin-top: var(--s-3);
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

/* Under its date. Busy or away is said in the warning colour and in words; free in the colour of
   good news. */
.new__busy {
  margin-top: var(--s-1);
  font: var(--t-small);
  color: var(--c-ink-soft);
  overflow-wrap: anywhere;
}

.new__busy-taken {
  color: var(--c-warning);
}

.new__busy-free {
  color: var(--c-success);
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

/* A phone: the tiles are narrow, and "Something else" would be cut. Two lines of smaller text. */
@media (max-width: 767px) {
  .new__type-label {
    font: var(--t-small);
    font-weight: 600;
    text-align: center;
    white-space: normal;
  }
}
</style>
