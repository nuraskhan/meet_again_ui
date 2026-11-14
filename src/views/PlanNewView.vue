<script setup lang="ts">
// The invitation form. Choosing a type fills it in; the user changes what they want, ticks the
// friends and sends.

import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import type { EventTypeCode, EventTypeInfo, Friend } from '@/api/types'
import UserAvatar from '@/components/UserAvatar.vue'
import { distanceRange, EVENT_TYPE_LOOK, localInputToIso, priceRange } from '@/lib/format'
import { errorText, toastError, toastOk } from '@/stores/toast'

const router = useRouter()

const types = ref<EventTypeInfo[]>([])
const friends = ref<Friend[]>([])
const loading = ref<boolean>(true)
const busy = ref<boolean>(false)
const error = ref<string>('')

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
})

/** The server accepts at most this many proposed dates. */
const MAX_TIMES = 10

// Nobody has to be ticked: the plan can be shared by its link afterwards.
const canSend = computed<boolean>(() => chosen.value !== null && !busy.value)

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
    return
  }
  if (form.priceMin > form.priceMax) {
    error.value = 'The lowest price is greater than the highest.'
    return
  }

  error.value = ''
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
      inviteeIds: form.inviteeIds,
    })

    toastOk(
      form.inviteeIds.length === 0
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
  <main class="page">
    <div class="page__head">
      <h1 class="page__title">New invitation</h1>
      <RouterLink class="btn btn--ghost btn--small" :to="{ name: 'plans' }">Cancel</RouterLink>
    </div>

    <p v-if="loading" class="muted">Loading…</p>

    <form v-else class="stack new" data-tst-id="plan-new-form" @submit.prevent="send">
      <!-- ---------------------------------------------------------- 1. what -->
      <section>
        <h2 class="section__title">1. What are we doing?</h2>

        <div class="new__types">
          <button
            v-for="type in types"
            :key="type.eventType"
            class="type"
            :class="{ 'type--chosen': chosen === type.eventType }"
            type="button"
            :aria-pressed="chosen === type.eventType"
            :data-tst-id="'plan-new-type-' + type.eventType"
            @click="choose(type)"
          >
            <span class="type__icon" aria-hidden="true">{{ EVENT_TYPE_LOOK[type.eventType].icon }}</span>
            <span class="type__label">{{ EVENT_TYPE_LOOK[type.eventType].label }}</span>
          </button>
        </div>
      </section>

      <template v-if="chosen !== null">
        <!-- -------------------------------------------------------- 2. details -->
        <section class="card stack">
          <h2 class="section__title new__card-title">2. The details</h2>
          <p class="small muted new__prefilled">Filled in for you - change anything.</p>

          <label class="field">
            <span class="field__label">Title</span>
            <input
              v-model.trim="form.title"
              class="input"
              type="text"
              maxlength="200"
              required
              data-tst-id="plan-new-title"
            />
          </label>

          <fieldset class="new__range">
            <legend class="field__label">When</legend>

            <div v-for="(_, index) in form.times" :key="index" class="new__time">
              <input
                v-model="form.times[index]"
                class="input"
                type="datetime-local"
                :aria-label="'Proposed date ' + (index + 1)"
                :data-tst-id="'plan-new-when-' + index"
              />
              <button
                v-if="form.times.length > 1"
                class="new__time-remove"
                type="button"
                :aria-label="'Remove proposed date ' + (index + 1)"
                @click="form.times.splice(index, 1)"
              >
                ✕
              </button>
            </div>

            <div>
              <button
                v-if="form.times.length < MAX_TIMES"
                class="btn btn--ghost btn--small"
                type="button"
                data-tst-id="plan-new-when-add"
                @click="form.times.push('')"
              >
                + Offer another date
              </button>
            </div>

            <span class="field__hint">
              Offer one date or several to choose from. Leave empty to agree on the time in the chat.
            </span>
          </fieldset>

          <div class="new__pair">
            <fieldset class="new__range">
              <legend class="field__label">Distance from you, miles</legend>
              <div class="new__range-inputs">
                <input
                  v-model.number="form.distanceMinMi"
                  class="input"
                  type="number"
                  min="0"
                  max="1000"
                  required
                  aria-label="Shortest distance, miles"
                  data-tst-id="plan-new-distance-min"
                />
                <span class="muted">to</span>
                <input
                  v-model.number="form.distanceMaxMi"
                  class="input"
                  type="number"
                  min="0"
                  max="1000"
                  required
                  aria-label="Longest distance, miles"
                  data-tst-id="plan-new-distance-max"
                />
              </div>
              <span class="field__hint">{{ distanceRange(form.distanceMinMi, form.distanceMaxMi) }}</span>
            </fieldset>

            <fieldset class="new__range">
              <legend class="field__label">Budget per person</legend>
              <div class="new__range-inputs">
                <input
                  v-model.number="form.priceMin"
                  class="input"
                  type="number"
                  min="0"
                  step="100"
                  required
                  aria-label="Lowest price"
                  data-tst-id="plan-new-price-min"
                />
                <span class="muted">to</span>
                <input
                  v-model.number="form.priceMax"
                  class="input"
                  type="number"
                  min="0"
                  step="100"
                  required
                  aria-label="Highest price"
                  data-tst-id="plan-new-price-max"
                />
              </div>
              <span class="field__hint">{{ priceRange(form.priceMin, form.priceMax) }}</span>
            </fieldset>
          </div>

          <label class="field">
            <span class="field__label">A note for your friends</span>
            <textarea
              v-model="form.description"
              class="input"
              maxlength="2000"
              placeholder="Anything they should know"
              data-tst-id="plan-new-note"
            ></textarea>
          </label>
        </section>

        <!-- -------------------------------------------------------- 3. who -->
        <section class="card">
          <h2 class="section__title new__card-title">3. Who is invited?</h2>

          <p class="small muted new__who-hint" data-tst-id="plan-new-link-hint">
            <template v-if="friends.length === 0">
              You have no friends here yet - that is fine. After creating the plan you get a link to
              send to anyone.
            </template>
            <template v-else>
              Tick friends, or tick nobody and send the link you get after creating the plan.
            </template>
          </p>

          <ul v-if="friends.length > 0" class="new__friends">
            <li v-for="friend in friends" :key="friend.userId">
              <label class="friend" :class="{ 'friend--picked': form.inviteeIds.includes(friend.userId) }">
                <input
                  class="friend__box"
                  type="checkbox"
                  :checked="form.inviteeIds.includes(friend.userId)"
                  :data-tst-id="'plan-new-friend-' + friend.userId"
                  @change="toggle(friend.userId)"
                />
                <UserAvatar :name="friend.displayName" :user-id="friend.userId" :avatar-url="friend.avatarUrl" />
                <span class="grow">
                  <span class="friend__name">{{ friend.displayName }}</span>
                  <span v-if="friend.city" class="small muted friend__city">{{ friend.city }}</span>
                </span>
              </label>
            </li>
          </ul>
        </section>

        <p v-if="error !== ''" class="form-error" role="alert" data-tst-id="plan-new-error">{{ error }}</p>

        <div class="new__send">
          <p class="small muted">
            {{
              form.inviteeIds.length === 0
                ? 'You will get a link to share. A chat is created for everyone who joins.'
                : 'A group chat with ' +
                  form.inviteeIds.length +
                  (form.inviteeIds.length === 1 ? ' friend' : ' friends') +
                  ' will be created. You also get a link for others.'
            }}
          </p>
          <button class="btn btn--big" type="submit" :disabled="!canSend" data-tst-id="plan-new-send">
            {{ busy ? 'Creating…' : form.inviteeIds.length === 0 ? 'Create and get the link' : 'Send invitation' }}
          </button>
        </div>
      </template>
    </form>
  </main>
</template>

<style scoped>
.new {
  gap: 22px;
}

.new__types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}

.type {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 16px 8px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-m);
  background: var(--c-surface);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.type:hover {
  border-color: color-mix(in srgb, var(--c-accent) 50%, var(--c-line));
  transform: translateY(-1px);
}

.type--chosen,
.type--chosen:hover {
  border-color: var(--c-accent);
  background: var(--c-accent-soft);
  box-shadow: 0 0 0 2px var(--c-accent);
}

.type__icon {
  font-size: 1.8rem;
  line-height: 1;
}

.type__label {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

.new__card-title {
  margin-bottom: 0;
}

.new__prefilled {
  margin-top: -8px;
}

.new__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.new__range {
  display: grid;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.new__range-inputs {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
}

.new__time {
  display: flex;
  align-items: center;
  gap: 8px;
}

.new__time-remove {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-ink-faint);
  cursor: pointer;
}

.new__time-remove:hover {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.new__who-hint {
  margin: 4px 0 10px;
}

.new__friends {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.friend {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-s);
  cursor: pointer;
}

.friend:hover {
  background: var(--c-surface-soft);
}

.friend--picked,
.friend--picked:hover {
  border-color: color-mix(in srgb, var(--c-teal) 50%, transparent);
  background: var(--c-teal-soft);
}

.friend__box {
  width: 20px;
  height: 20px;
  accent-color: var(--c-teal);
}

.friend__name {
  display: block;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.friend__city {
  display: block;
}

.new__send {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 560px) {
  .new__pair {
    grid-template-columns: 1fr;
  }
}
</style>
