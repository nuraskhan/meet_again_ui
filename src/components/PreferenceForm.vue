<script setup lang="ts">
// A guest's preference for one event: where they are (the device's location, with their
// permission, a pin on the map, or a place they type) and how far they are ready to travel, in miles.
// Once saved it folds into one line ("Brooklyn · up to 5 mi") with "Change", which opens the form again.

import { computed, reactive, ref, useId, watch } from 'vue'
import { LocateFixed, MapPin } from 'lucide-vue-next'
import { api } from '@/api'
import type { EventDto, Preference } from '@/api/types'
import LocationMap from '@/components/LocationMap.vue'
import { errorText, toastOk } from '@/stores/toast'

const props = defineProps<{
  eventId: number
  /** What is saved already; null = nothing yet. */
  current: Preference | null
}>()

const emit = defineEmits<{
  /** The event as the server returned it after saving. */
  saved: [event: EventDto]
}>()

const RADIUS_CHOICES: number[] = [1, 5, 10, 25, 50]
const DEFAULT_RADIUS = 10
const MAX_RADIUS = 500

const form = reactive({
  latitude: null as number | null,
  longitude: null as number | null,
  locationText: '',
  travelRadiusMi: DEFAULT_RADIUS,
})

const locating = ref<boolean>(false)
const locationError = ref<string>('')
const busy = ref<boolean>(false)
const error = ref<string>('')
/** The form is open. With nothing saved it always is; with something saved - after "Change". */
const editing = ref<boolean>(props.current === null)

/** Ties the labels to their fields; unique, should the form ever stand twice on a page. */
const placeId: string = useId()
const radiusId: string = useId()

const hasCoordinates = computed<boolean>(() => form.latitude !== null && form.longitude !== null)
const hasPlace = computed<boolean>(() => hasCoordinates.value || form.locationText.trim() !== '')

/** What is saved, in one line: "Brooklyn · up to 5 mi". Without a typed place the pin stands for it. */
const savedLine = computed<string>(() => {
  if (props.current === null) {
    return ''
  }
  const place: string = props.current.locationText ?? 'Pin on the map'
  return place + ' · up to ' + props.current.travelRadiusMi + ' mi'
})

// Show what is saved; refill when the parent reloads the event.
watch(() => props.current, fill, { immediate: true })

function fill(): void {
  const current: Preference | null = props.current
  form.latitude = current?.latitude ?? null
  form.longitude = current?.longitude ?? null
  form.locationText = current?.locationText ?? ''
  form.travelRadiusMi = current?.travelRadiusMi ?? DEFAULT_RADIUS
  if (current === null) {
    // Nothing is saved (any more): there is no line to fold into.
    editing.value = true
  }
}

/** "Cancel" in the form opened by "Change": back to what is saved. */
function stopEditing(): void {
  fill()
  error.value = ''
  locationError.value = ''
  editing.value = false
}

/** Asks the browser for the position. The browser asks the person; nothing happens without a yes. */
function useDeviceLocation(): void {
  locationError.value = ''

  if (!('geolocation' in navigator)) {
    locationError.value = 'This browser cannot share a location. Type where you are instead.'
    return
  }

  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Five decimals is about a yard: more than enough, and no false precision.
      form.latitude = Number(position.coords.latitude.toFixed(5))
      form.longitude = Number(position.coords.longitude.toFixed(5))
      locating.value = false
    },
    (failure) => {
      locating.value = false
      locationError.value =
        failure.code === failure.PERMISSION_DENIED
          ? 'Location access was not allowed. You can type where you are instead.'
          : 'Could not get your location. Try again, or type where you are.'
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
  )
}

/** The person clicked the map or dropped the pin. */
function setPoint(latitude: number, longitude: number): void {
  form.latitude = latitude
  form.longitude = longitude
  locationError.value = ''
}

function forgetPoint(): void {
  form.latitude = null
  form.longitude = null
}

async function save(): Promise<void> {
  if (!hasPlace.value) {
    error.value = 'Share your location or type where you are.'
    return
  }

  error.value = ''
  busy.value = true
  try {
    const text: string = form.locationText.trim()
    const event: EventDto = await api.savePreference(props.eventId, {
      latitude: form.latitude,
      longitude: form.longitude,
      locationText: text === '' ? null : text,
      travelRadiusMi: form.travelRadiusMi,
    })
    toastOk('Saved')
    editing.value = false
    emit('saved', event)
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- ------------------------------------------------------------ saved: one line -->
  <div v-if="current !== null && !editing" class="hg-row preference__saved">
    <MapPin class="hg-icon preference__saved-icon" :stroke-width="1.5" aria-hidden="true" />
    <span class="hg-row__text preference__saved-text">
      <span class="hg-row__title" data-tst-id="preference-located">{{ savedLine }}</span>
    </span>
    <button class="hg-btn hg-btn--quiet" type="button" data-tst-id="preference-change" @click="editing = true">
      Change
    </button>
  </div>

  <!-- ------------------------------------------------------------ the form -->
  <form v-else class="preference" data-tst-id="preference-form" @submit.prevent="save">
    <!-- where -->
    <div class="hg-field">
      <label class="hg-field__label" :for="placeId">Where are you coming from?</label>
      <div class="preference__place">
        <input
          :id="placeId"
          v-model="form.locationText"
          class="hg-input"
          type="text"
          maxlength="200"
          placeholder="City, neighborhood or address"
          data-tst-id="preference-place"
        />
        <button
          class="hg-btn hg-btn--outline"
          :class="{ 'is-loading': locating }"
          type="button"
          :disabled="locating"
          data-tst-id="preference-locate"
          @click="useDeviceLocation"
        >
          <LocateFixed class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span>Use my location</span>
        </button>
      </div>
      <p class="hg-field__msg">
        The pin stays private. The others see only what you type here, and that a location was shared.
      </p>
    </div>

    <p v-if="locationError !== ''" class="app-error" role="alert">{{ locationError }}</p>

    <div class="preference__map">
      <LocationMap :latitude="form.latitude" :longitude="form.longitude" @pick="setPoint" />

      <div class="preference__pin">
        <p
          class="preference__pin-note"
          :class="{ 'preference__pin-note--set': hasCoordinates }"
          data-tst-id="preference-located"
        >
          <MapPin v-if="hasCoordinates" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span>
            {{
              hasCoordinates
                ? 'Pin set. Drag it or click the map to move it.'
                : 'Click the map to drop a pin, or use your location.'
            }}
          </span>
        </p>
        <button
          v-if="hasCoordinates"
          class="hg-btn hg-btn--quiet hg-btn--sm"
          type="button"
          data-tst-id="preference-unpin"
          @click="forgetPoint"
        >
          Remove pin
        </button>
      </div>
    </div>

    <!-- how far -->
    <div class="hg-field">
      <label class="hg-field__label" :for="radiusId">How far will you travel?</label>
      <div class="preference__radius">
        <button
          v-for="miles in RADIUS_CHOICES"
          :key="miles"
          class="hg-chip hg-num"
          type="button"
          :aria-pressed="form.travelRadiusMi === miles"
          :data-tst-id="'preference-radius-' + miles"
          @click="form.travelRadiusMi = miles"
        >
          {{ miles }} mi
        </button>

        <span class="preference__custom">
          <input
            :id="radiusId"
            v-model.number="form.travelRadiusMi"
            class="hg-input hg-num preference__miles"
            type="number"
            min="1"
            :max="MAX_RADIUS"
            required
            aria-label="Travel radius in miles"
            data-tst-id="preference-radius"
          />
          <span class="hg-soft">mi</span>
        </span>
      </div>
    </div>

    <p v-if="error !== ''" class="app-error" role="alert" data-tst-id="preference-error">{{ error }}</p>

    <div class="preference__actions">
      <button
        class="hg-btn hg-btn--neutral"
        :class="{ 'is-loading': busy }"
        type="submit"
        :disabled="busy"
        data-tst-id="preference-save"
      >
        <span>{{ current === null ? 'Save' : 'Update' }}</span>
      </button>
      <button v-if="current !== null" class="hg-btn hg-btn--quiet" type="button" :disabled="busy" @click="stopEditing">
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
/* The saved line: a list row standing alone, so it gets a frame of its own. */
.preference__saved {
  padding: 0 var(--s-2) 0 var(--s-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-m);
}

.preference__saved-icon {
  color: var(--c-ink-soft);
}

.preference__saved-text {
  border-bottom: 0;
}

.preference {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.preference__place {
  display: flex;
  gap: var(--s-2);
}

.preference__map {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.preference__pin {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2) var(--s-3);
  min-height: var(--size-control-sm);
}

.preference__pin-note {
  display: flex;
  align-items: flex-start;
  gap: var(--s-1);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.preference__pin-note--set {
  color: var(--c-ink);
}

.preference__pin-note .hg-icon {
  width: var(--s-4);
  height: var(--s-4);
}

.preference__radius {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.preference__custom {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}

.preference__miles {
  width: calc(var(--s-8) + var(--s-6));
}

.preference__actions {
  display: flex;
  gap: var(--s-2);
}

/* Phone: the button goes under the field, and the actions take the whole width. */
@media (max-width: 767px) {
  .preference__place {
    flex-direction: column;
  }

  .preference__actions .hg-btn {
    flex: 1 1 0;
  }
}
</style>
