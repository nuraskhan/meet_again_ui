<script setup lang="ts">
// Choosing a venue for a plan: a dialog with a search field, two filters (the activity, the city)
// and the venues that match, the best rated first. Pressing a venue chooses it; attaching it to the
// plan is the caller's job. On a phone the dialog is a sheet from the bottom, the list scrolling
// inside it.

import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { MapPinOff, Search, Star, X } from 'lucide-vue-next'
import { api } from '@/api'
import type { EventTypeCode, Place } from '@/api/types'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import { EVENT_TYPE_LOOK } from '@/lib/format'
import { toastError } from '@/stores/toast'

const props = defineProps<{
  /** The activity of the plan: the filter the dialog opens with. */
  category: EventTypeCode
  /** The caller is attaching the chosen venue: nothing else can be chosen meanwhile. */
  busy?: boolean
}>()

const emit = defineEmits<{
  choose: [place: Place]
  close: []
}>()

/** How many venues one search brings: more than anyone reads; a longer list means "type a word". */
const LIMIT: number = 30
/** The pause after the last key before the server is asked. */
const DEBOUNCE_MS: number = 300
/** How many rows the skeleton shows. */
const SKELETONS: number = 5

const titleId: string = useId()
const searchId: string = useId()
const cityId: string = useId()

const dialog = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const query = ref<string>('')
/** Only venues for the activity of the plan; off = any venue. */
const sameActivity = ref<boolean>(true)
/** '' = any city. */
const city = ref<string>('')
const cities = ref<string[]>([])

const places = ref<Place[]>([])
const loading = ref<boolean>(true)
/** There is not one venue in the system; null = not asked (asked once, when a search finds nothing). */
const nothingLoaded = ref<boolean | null>(null)

const filtered = computed<boolean>(() => query.value.trim() !== '' || sameActivity.value || city.value !== '')

/** The number of the latest search: an answer to an earlier one arriving late is dropped. */
let latest: number = 0
let timer: number | undefined

async function search(): Promise<void> {
  const mine: number = ++latest
  loading.value = true
  try {
    const found: Place[] = await api.places({
      category: sameActivity.value ? props.category : undefined,
      city: city.value,
      q: query.value.trim(),
      limit: LIMIT,
    })
    if (mine !== latest) {
      return
    }
    places.value = found
    if (found.length === 0) {
      await checkNothingLoaded()
    }
  } catch (caught) {
    if (mine === latest) {
      places.value = []
      toastError(caught)
    }
  } finally {
    if (mine === latest) {
      loading.value = false
    }
  }
}

/** Tells "nothing matches" from "there is nothing at all": the advice to the person differs. */
async function checkNothingLoaded(): Promise<void> {
  if (!filtered.value) {
    nothingLoaded.value = true
    return
  }
  if (nothingLoaded.value !== null) {
    return
  }
  try {
    nothingLoaded.value = (await api.places({ limit: 1 })).length === 0
  } catch {
    // Not knowing is fine: the ordinary "no places match" is shown.
  }
}

// A filter answers at once; typing waits for a pause, so a word is one request and not five.
watch([sameActivity, city], () => {
  window.clearTimeout(timer)
  void search()
})
watch(query, () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void search(), DEBOUNCE_MS)
})

/** What had the focus before the dialog opened: it gets the focus back when the dialog closes. */
let opener: HTMLElement | null = null

onMounted(async () => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  searchInput.value?.focus()
  document.addEventListener('keydown', onKey)
  void search()
  try {
    cities.value = await api.placeCities()
  } catch {
    // Without the cities the filter is simply not shown; the search itself still works.
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(timer)
  document.removeEventListener('keydown', onKey)
  opener?.focus()
})

/** Escape closes; Tab stays inside the dialog, as in any modal one. */
function onKey(pressed: KeyboardEvent): void {
  if (pressed.key === 'Escape') {
    pressed.preventDefault()
    emit('close')
    return
  }
  if (pressed.key !== 'Tab' || dialog.value === null) {
    return
  }
  const stops: HTMLElement[] = Array.from(
    dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), input, select'),
  )
  const first: HTMLElement | undefined = stops[0]
  const last: HTMLElement | undefined = stops[stops.length - 1]
  if (first === undefined || last === undefined) {
    return
  }
  const current: Element | null = document.activeElement
  if (pressed.shiftKey && (current === first || !dialog.value.contains(current))) {
    pressed.preventDefault()
    last.focus()
  } else if (!pressed.shiftKey && (current === last || !dialog.value.contains(current))) {
    pressed.preventDefault()
    first.focus()
  }
}

/** "12 Abay Ave · Almaty"; the city is left out when unknown. */
function whereLine(place: Place): string {
  return place.city !== null && place.city !== '' ? place.address + ' · ' + place.city : place.address
}
</script>

<template>
  <!-- A press on the scrim itself (not on the dialog) closes. -->
  <div class="hg-scrim picker__scrim" @click.self="emit('close')">
    <div
      ref="dialog"
      class="hg-dialog picker"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      data-tst-id="place-picker"
    >
      <div class="picker__head">
        <h2 :id="titleId" class="hg-dialog__title picker__title">Choose a place</h2>
        <button
          class="hg-iconbtn"
          type="button"
          aria-label="Close"
          data-tst-id="place-picker-close"
          @click="emit('close')"
        >
          <X class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        </button>
      </div>

      <div class="picker__filters">
        <div class="hg-field">
          <label class="hg-field__label" :for="searchId">Name or address</label>
          <div class="hg-field__control">
            <Search class="hg-icon hg-field__lead" :stroke-width="1.5" aria-hidden="true" />
            <input
              :id="searchId"
              ref="searchInput"
              v-model="query"
              class="hg-input hg-input--lead"
              type="search"
              autocomplete="off"
              maxlength="100"
              data-tst-id="place-picker-search"
            />
          </div>
        </div>

        <div class="picker__narrow">
          <div class="picker__chips" role="group" aria-label="Activity">
            <button
              class="hg-chip"
              type="button"
              :aria-pressed="sameActivity"
              data-tst-id="place-picker-activity"
              @click="sameActivity = true"
            >
              <EventTypeIcon :type="category" :size="16" />
              {{ EVENT_TYPE_LOOK[category].label }}
            </button>
            <button
              class="hg-chip"
              type="button"
              :aria-pressed="!sameActivity"
              data-tst-id="place-picker-any-activity"
              @click="sameActivity = false"
            >
              Any
            </button>
          </div>

          <!-- No cities known: nothing to choose from, so no control. -->
          <div v-if="cities.length > 0" class="picker__city">
            <label class="hg-sr" :for="cityId">City</label>
            <select :id="cityId" v-model="city" class="hg-input" data-tst-id="place-picker-city">
              <option value="">Any city</option>
              <option v-for="name in cities" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- The only part that scrolls: the filters stay in sight above it. -->
      <div class="picker__results" :aria-busy="loading">
        <div v-if="loading" aria-hidden="true">
          <div v-for="index in SKELETONS" :key="index" class="picker__skel-row">
            <span class="hg-skel hg-skel--circle picker__skel-icon"></span>
            <span class="picker__skel-text">
              <span class="hg-skel hg-skel--line picker__skel-name"></span>
              <span class="hg-skel hg-skel--line picker__skel-addr"></span>
            </span>
          </div>
        </div>
        <span v-if="loading" class="hg-sr" role="status">Looking for places</span>

        <div v-else-if="places.length === 0" class="hg-empty picker__empty" data-tst-id="place-picker-empty">
          <MapPinOff class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <p class="hg-empty__text">
            {{
              nothingLoaded === true
                ? 'There are no places loaded yet.'
                : 'No places match. Try another word or city.'
            }}
          </p>
        </div>

        <ul v-else class="hg-list">
          <li v-for="place in places" :key="place.id">
            <button
              class="picker__row"
              type="button"
              :disabled="busy"
              data-tst-id="place-picker-row"
              @click="emit('choose', place)"
            >
              <span class="picker__row-icon">
                <EventTypeIcon :type="place.category" :size="20" />
              </span>
              <span class="picker__row-text">
                <span class="picker__row-name">{{ place.name }}</span>
                <span class="picker__row-addr">{{ whereLine(place) }}</span>
              </span>
              <span class="picker__row-trail">
                <span
                  v-if="place.rating !== null"
                  class="hg-place__rating"
                  :aria-label="'Rated ' + place.rating.toFixed(1) + ' out of 5'"
                >
                  <Star class="hg-icon" :stroke-width="1.5" aria-hidden="true" />{{ place.rating.toFixed(1) }}
                </span>
                <span v-if="place.sample" class="hg-badge" title="An invented place for demonstration">Sample</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Over the page and its bars (20), under the toasts (50): an error of the search must be seen. */
.picker__scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
}

/* A column of fixed parts and one that scrolls; never taller than the window. */
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  height: 640px;
  max-height: 100%;
  min-height: 0;
}

.picker__head {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.picker__title {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.picker__filters {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.picker__narrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2) var(--s-4);
}

.picker__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.picker__city {
  flex: 1 1 160px;
  min-width: 0;
}

/* The negative margin lets a row's hover reach the edges of the dialog's padding. */
.picker__results {
  flex: 1 1 0;
  min-height: 0;
  margin: 0 calc(var(--s-2) * -1);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* ---- a venue: a button dressed as a list row ---- */
.picker__row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  width: 100%;
  min-height: var(--size-control-lg);
  padding: var(--s-2);
  border: 0;
  border-radius: var(--r-m);
  background: transparent;
  color: var(--c-ink);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-1) var(--ease);
}

.picker__row:hover {
  background: var(--c-surface-soft);
}

.picker__row:active {
  background: var(--c-surface-strong);
}

.picker__row:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.picker__row-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--size-control);
  height: var(--size-control);
  border-radius: var(--r-full);
  background: var(--c-surface-soft);
  color: var(--c-ink-soft);
}

.picker__row-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.picker__row-name {
  font: var(--t-body-strong);
  overflow-wrap: anywhere;
}

.picker__row-addr {
  color: var(--c-ink-soft);
  font: var(--t-small);
  overflow-wrap: anywhere;
}

.picker__row-trail {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--s-1);
  font: var(--t-small);
}

.picker__empty {
  padding: var(--s-6) var(--s-4);
}

/* ---- loading ---- */
.picker__skel-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-2);
}

.picker__skel-icon {
  flex: none;
  width: var(--size-control);
  height: var(--size-control);
}

.picker__skel-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--s-2);
}

.picker__skel-name {
  width: 55%;
}

.picker__skel-addr {
  width: 80%;
}

/* ---- phone: a sheet from the bottom (the shape of the designers' "hg-sheet"), most of the height ---- */
@media (max-width: 767px) {
  .picker__scrim {
    place-items: end stretch;
    padding: 0;
  }

  .picker {
    width: 100%;
    height: 88vh;
    height: 88dvh;
    padding: var(--s-4) var(--s-4) calc(var(--s-4) + env(safe-area-inset-bottom));
    border-radius: var(--r-l) var(--r-l) 0 0;
  }
}
</style>
