<script setup lang="ts">
// A guest's preference for one event: where they are (the device's location, with their
// permission, a pin on the map, or a place they type) and how far they are ready to travel, in miles.

import { computed, reactive, ref, watch } from 'vue'
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

const hasCoordinates = computed<boolean>(() => form.latitude !== null && form.longitude !== null)
const hasPlace = computed<boolean>(() => hasCoordinates.value || form.locationText.trim() !== '')

// Show what is saved; refill when the parent reloads the event.
watch(
  () => props.current,
  (current) => {
    form.latitude = current?.latitude ?? null
    form.longitude = current?.longitude ?? null
    form.locationText = current?.locationText ?? ''
    form.travelRadiusMi = current?.travelRadiusMi ?? DEFAULT_RADIUS
  },
  { immediate: true },
)

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
    emit('saved', event)
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="stack preference" data-tst-id="preference-form" @submit.prevent="save">
    <!-- ------------------------------------------------------------ where -->
    <fieldset class="preference__group">
      <legend class="field__label">Where are you?</legend>

      <LocationMap :latitude="form.latitude" :longitude="form.longitude" @pick="setPoint" />

      <div class="preference__map-row">
        <p class="small" :class="hasCoordinates ? 'preference__pinned' : 'muted'" data-tst-id="preference-located">
          {{
            hasCoordinates
              ? '📍 Pin set. Drag it or click the map to move it.'
              : 'Click the map to drop a pin, or use your current location.'
          }}
        </p>

        <div class="row">
          <button
            class="btn btn--ghost btn--small"
            type="button"
            :disabled="locating"
            data-tst-id="preference-locate"
            @click="useDeviceLocation"
          >
            {{ locating ? 'Asking your browser…' : 'Use my current location' }}
          </button>
          <button
            v-if="hasCoordinates"
            class="btn btn--ghost btn--small"
            type="button"
            data-tst-id="preference-unpin"
            @click="forgetPoint"
          >
            Remove pin
          </button>
        </div>
      </div>

      <p v-if="locationError !== ''" class="small preference__location-error" role="alert">
        {{ locationError }}
      </p>

      <label class="field">
        <span class="field__hint">{{ hasCoordinates ? 'Add a name for the place (optional)' : 'or type where you are' }}</span>
        <input
          v-model="form.locationText"
          class="input"
          type="text"
          maxlength="200"
          placeholder="City, neighborhood or address"
          aria-label="Where you are"
          data-tst-id="preference-place"
        />
      </label>

      <p class="field__hint">
        The pin stays private. The others see only what you type here, and that a location
        was shared.
      </p>
    </fieldset>

    <!-- ------------------------------------------------------------ how far -->
    <fieldset class="preference__group">
      <legend class="field__label">How far will you travel?</legend>

      <div class="preference__radius">
        <button
          v-for="miles in RADIUS_CHOICES"
          :key="miles"
          class="chip preference__choice"
          :class="{ 'preference__choice--on': form.travelRadiusMi === miles }"
          type="button"
          :aria-pressed="form.travelRadiusMi === miles"
          :data-tst-id="'preference-radius-' + miles"
          @click="form.travelRadiusMi = miles"
        >
          {{ miles }} mi
        </button>

        <label class="preference__custom">
          <input
            v-model.number="form.travelRadiusMi"
            class="input"
            type="number"
            min="1"
            :max="MAX_RADIUS"
            required
            aria-label="Travel radius in miles"
            data-tst-id="preference-radius"
          />
          <span class="muted">miles</span>
        </label>
      </div>
    </fieldset>

    <p v-if="error !== ''" class="form-error" role="alert" data-tst-id="preference-error">{{ error }}</p>

    <div>
      <button class="btn" type="submit" :disabled="busy" data-tst-id="preference-save">
        {{ busy ? 'Saving…' : current === null ? 'Save' : 'Update' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.preference {
  gap: 20px;
}

.preference__group {
  display: grid;
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.preference__map-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.preference__pinned {
  color: var(--c-teal);
  font-weight: 600;
}

.preference__location-error {
  color: var(--c-danger);
}

.preference__radius {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preference__choice {
  cursor: pointer;
}

.preference__choice:hover {
  border-color: var(--c-teal);
}

.preference__choice--on,
.preference__choice--on:hover {
  border-color: var(--c-teal);
  background: var(--c-teal);
  color: var(--c-on-teal);
  font-weight: 700;
}

.preference__custom {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.preference__custom .input {
  width: 96px;
}
</style>
