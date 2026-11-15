<script setup lang="ts">
// "Where to go": the places the server suggested for a plan, and the button that asks for them.
// The suggestions are kept with the plan; this block shows what is kept, and asks again on request.
// The look is the designers' "hg-places": cards side by side, one under another on a phone.

import { computed, ref } from 'vue'
import { Check, MapPin, Star } from 'lucide-vue-next'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { EventDto, Suggestion } from '@/api/types'
import { date, EVENT_TYPE_LOOK, priceRange } from '@/lib/format'
import { errorText } from '@/stores/toast'

const props = defineProps<{
  event: EventDto
  /** The current user is part of the plan (its creator, or a guest who has not declined) and it is active. */
  canAsk: boolean
  /** The viewer may make a suggestion the venue of the plan (the organiser of an active plan). */
  canChoose?: boolean
  /** A choice is being saved by the parent: the buttons wait. */
  choosing?: boolean
}>()

const emit = defineEmits<{
  /** The event as the server returned it with fresh suggestions. */
  updated: [event: EventDto]
  /** "Choose this place" was pressed; attaching it to the plan is the parent's job. */
  choose: [placeId: number]
}>()

const busy = ref<boolean>(false)
/** Why the last request gave nothing; empty when there is nothing to say. */
const problem = ref<string>('')

const looked = computed<boolean>(() => props.event.suggestedAt !== null)
const considered = computed<number>(() => props.event.suggestions[0]?.participantsConsidered ?? 0)

async function ask(): Promise<void> {
  busy.value = true
  problem.value = ''
  try {
    emit('updated', await api.refreshSuggestions(props.event.id))
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'no_coordinates') {
      // Nobody is on the map yet - often one person planning alone. Instead of sending them to
      // the location form first, ask the device where they are and look for places at once.
      await askFromHere()
    } else {
      problem.value = errorText(caught)
    }
  } finally {
    busy.value = false
  }
}

/** Takes the position of the device (the browser asks the person) and suggests from there. */
async function askFromHere(): Promise<void> {
  const position: { latitude: number; longitude: number } | null = await whereAmI()
  if (position === null) {
    problem.value =
      'To suggest places we need to know where you are. Allow the location in your browser, or put your pin on the map below, then ask again.'
    return
  }
  try {
    emit('updated', await api.refreshSuggestions(props.event.id, position))
  } catch (caught) {
    problem.value = errorText(caught)
  }
}

/** The position of the device; null if there is none or the person said no. */
function whereAmI(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (found) => resolve({ latitude: found.coords.latitude, longitude: found.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}

/** The place on OpenStreetMap, in a new tab. */
function mapLink(suggestion: Suggestion): string {
  const lat: string = suggestion.latitude.toFixed(5)
  const lon: string = suggestion.longitude.toFixed(5)
  return 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=16/' + lat + '/' + lon
}

/**
 * What one spends there, or null when it is not known: an unknown price must not read as "Free".
 * A known upper bound alone is still worth saying ("up to ...").
 */
function priceLine(suggestion: Suggestion): string | null {
  return suggestion.priceMax === null ? null : priceRange(suggestion.priceMin ?? 0, suggestion.priceMax)
}

/** Only an ordinary web address becomes a link; anything else stored as a "website" is ignored. */
function safeWebsite(website: string | null): string | null {
  return website !== null && /^https?:\/\//i.test(website) ? website : null
}
</script>


<template>
  <section v-if="canAsk || event.suggestions.length > 0" class="places" data-tst-id="suggestions">
    <div class="places__head">
      <h2 class="places__title">Where to go</h2>
      <button
        v-if="canAsk"
        class="hg-btn"
        :class="[looked ? 'hg-btn--quiet' : 'hg-btn--neutral', { 'is-loading': busy }]"
        type="button"
        :disabled="busy"
        data-tst-id="suggestions-ask"
        @click="ask"
      >
        <span>{{ looked ? 'Suggest again' : 'Suggest places' }}</span>
      </button>
    </div>

    <p v-if="problem !== ''" class="app-error places__problem" role="alert" data-tst-id="suggestions-problem">
      {{ problem }}
    </p>

    <ol v-if="event.suggestions.length > 0" class="hg-places">
      <li
        v-for="suggestion in event.suggestions"
        :key="suggestion.placeId"
        class="hg-card hg-place"
        data-tst-id="suggestion"
      >
        <h3 class="hg-place__name places__name">{{ suggestion.name }}</h3>
        <span class="hg-place__cat">
          {{ EVENT_TYPE_LOOK[suggestion.category].label }}
          <!-- Nobody has rated it: no stars at all, rather than "0.0". -->
          <span
            v-if="suggestion.rating !== null"
            class="hg-place__rating"
            :aria-label="'Rated ' + suggestion.rating.toFixed(1) + ' out of 5'"
          >
            <Star class="hg-icon" :stroke-width="1.5" aria-hidden="true" />{{ suggestion.rating.toFixed(1) }}
          </span>
        </span>
        <p class="hg-place__addr places__wrap">{{ suggestion.address }}</p>

        <p v-if="suggestion.description" class="hg-place__addr places__wrap">{{ suggestion.description }}</p>

        <span v-if="suggestion.myDistanceMi !== null" class="hg-place__dist" data-tst-id="suggestion-my-distance">
          <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />{{ suggestion.myDistanceMi }} mi from you
        </span>

        <ul class="places__facts hg-num">
          <!-- With one person counted, the distance for everyone is the line above ("from you")
               said twice: shown only when it adds something. -->
          <li v-if="!(suggestion.participantsConsidered === 1 && suggestion.myDistanceMi !== null)">
            {{
              suggestion.participantsConsidered === 1
                ? suggestion.averageDistanceMi + ' mi away'
                : suggestion.averageDistanceMi + ' mi on average, ' + suggestion.farthestDistanceMi + ' mi for the farthest'
            }}
          </li>
          <li v-if="priceLine(suggestion) !== null">{{ priceLine(suggestion) }}</li>
          <li v-if="suggestion.phone">{{ suggestion.phone }}</li>
        </ul>

        <div
          v-if="!suggestion.withinEveryonesReach || !suggestion.fitsBudget || suggestion.sample"
          class="places__badges"
        >
          <span v-if="!suggestion.withinEveryonesReach" class="hg-badge hg-badge--warning">Too far for someone</span>
          <span v-if="!suggestion.fitsBudget" class="hg-badge hg-badge--warning">Outside the budget</span>
          <span v-if="suggestion.sample" class="hg-badge" title="An invented place for demonstration">Sample</span>
        </div>

        <!-- Pushed to the bottom, so the links of cards of different height stand on one line. -->
        <div class="places__links">
          <a class="hg-link" :href="mapLink(suggestion)" target="_blank" rel="noopener noreferrer">Map</a>
          <a
            v-if="safeWebsite(suggestion.website) !== null"
            class="hg-link"
            :href="safeWebsite(suggestion.website) ?? undefined"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website
          </a>
        </div>

        <!-- The organiser makes a suggestion the venue of the plan; the one already chosen says so. -->
        <template v-if="canChoose">
          <span
            v-if="event.place?.id === suggestion.placeId"
            class="hg-badge hg-badge--success places__chosen"
            data-tst-id="suggestion-chosen"
          >
            <Check class="hg-icon" :stroke-width="1.5" aria-hidden="true" />Chosen
          </span>
          <button
            v-else
            class="hg-btn hg-btn--outline hg-btn--sm places__choose"
            type="button"
            :disabled="choosing"
            data-tst-id="suggestion-choose"
            @click="emit('choose', suggestion.placeId)"
          >
            <span>Choose this place</span>
          </button>
        </template>
      </li>
    </ol>

    <p v-if="event.suggestions.length > 0 && event.suggestedAt !== null" class="places__basis">
      Based on where {{ considered === 1 ? '1 person is' : considered + ' people are' }} coming from ·
      suggested {{ date(event.suggestedAt) }} · distances as the crow flies
    </p>

    <p v-else-if="looked && event.suggestions.length === 0" class="hg-card hg-card--quiet" data-tst-id="suggestions-none">
      No places for this activity were found near you yet.
    </p>

    <p v-else-if="!looked" class="hg-card hg-card--quiet" data-tst-id="suggestions-not-yet">
      Press "Suggest places" to get ideas near you - it works when you plan alone too. Once
      others say where they are, ask again and the places will suit everyone.
    </p>
  </section>
</template>

<style scoped>
.places__head {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  margin-bottom: var(--s-4);
}

.places__title {
  flex: 1;
  min-width: 0;
  font: var(--t-title-2);
}

.places__problem {
  margin-bottom: var(--s-4);
}

/* A long name or address without spaces must not push a card wider than its column. */
.places__name,
.places__wrap {
  overflow-wrap: anywhere;
}

.places__facts {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  margin-top: var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.places__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1);
  margin-top: var(--s-2);
}

.places__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-4);
  margin-top: auto;
  padding-top: var(--s-3);
  font: var(--t-small);
}

/* Under the links, at their own width: a card is a column that would stretch them. */
.places__chosen,
.places__choose {
  align-self: flex-start;
  margin-top: var(--s-3);
}

.places__basis {
  margin-top: var(--s-3);
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* Between the phone (one column, in main.css) and a wide screen three cards do not fit next to the
   rail: two in a row. */
@media (min-width: 768px) and (max-width: 1279px) {
  .hg-places {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .places__head {
    flex-wrap: wrap;
  }
}
</style>
