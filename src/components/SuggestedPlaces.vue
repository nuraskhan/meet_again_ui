<script setup lang="ts">
// "Where to go": the places the server suggested for a plan, and the button that asks for them.
// The suggestions are kept with the plan; this block shows what is kept, and asks again on request.

import { computed, ref } from 'vue'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { EventDto, Suggestion } from '@/api/types'
import { date, priceRange } from '@/lib/format'
import { errorText } from '@/stores/toast'

const props = defineProps<{
  event: EventDto
  /** The current user is part of the plan (its creator, or a guest who has not declined) and it is active. */
  canAsk: boolean
}>()

const emit = defineEmits<{
  /** The event as the server returned it with fresh suggestions. */
  updated: [event: EventDto]
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
    // "Nobody is on the map yet" is not a failure: it tells what to do first.
    problem.value =
      caught instanceof ApiError && caught.code === 'no_coordinates'
        ? 'Nobody has put their location on the map yet. Drop your pin above, then ask again.'
        : errorText(caught)
  } finally {
    busy.value = false
  }
}

/** "★ 4.8" */
function stars(rating: number): string {
  return '★ ' + rating.toFixed(1)
}

/** The place on OpenStreetMap, in a new tab. */
function mapLink(suggestion: Suggestion): string {
  const lat: string = suggestion.latitude.toFixed(5)
  const lon: string = suggestion.longitude.toFixed(5)
  return 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=16/' + lat + '/' + lon
}

/** Only an ordinary web address becomes a link; anything else stored as a "website" is ignored. */
function safeWebsite(website: string | null): string | null {
  return website !== null && /^https?:\/\//i.test(website) ? website : null
}
</script>

<template>
  <section v-if="canAsk || event.suggestions.length > 0" class="section" data-tst-id="suggestions">
    <div class="places__head">
      <h2 class="section__title places__title">Where to go</h2>
      <button
        v-if="canAsk"
        class="btn btn--small"
        :class="{ 'btn--ghost': looked }"
        type="button"
        :disabled="busy"
        data-tst-id="suggestions-ask"
        @click="ask"
      >
        {{ busy ? 'Looking…' : looked ? 'Suggest again' : 'Suggest places' }}
      </button>
    </div>

    <p v-if="problem !== ''" class="form-error places__problem" role="alert" data-tst-id="suggestions-problem">
      {{ problem }}
    </p>

    <ol v-if="event.suggestions.length > 0" class="places">
      <li
        v-for="suggestion in event.suggestions"
        :key="suggestion.placeId"
        class="card place"
        data-tst-id="suggestion"
      >
        <div class="place__top">
          <span class="place__rank" aria-hidden="true">{{ suggestion.rank }}</span>
          <div class="grow">
            <h3 class="place__name">{{ suggestion.name }}</h3>
            <p class="small muted">{{ suggestion.address }}</p>
          </div>
          <span class="place__rating" :aria-label="'Rated ' + suggestion.rating.toFixed(1) + ' out of 5'">
            {{ stars(suggestion.rating) }}
          </span>
        </div>

        <p v-if="suggestion.description" class="place__about">{{ suggestion.description }}</p>

        <ul class="place__facts">
          <li v-if="suggestion.myDistanceMi !== null" data-tst-id="suggestion-my-distance">
            <span aria-hidden="true">📍</span> {{ suggestion.myDistanceMi }} mi from you
          </li>
          <li>
            <span aria-hidden="true">👥</span>
            {{
              suggestion.participantsConsidered === 1
                ? suggestion.averageDistanceMi + ' mi away'
                : suggestion.averageDistanceMi + ' mi on average, ' + suggestion.farthestDistanceMi + ' mi for the farthest'
            }}
          </li>
          <li><span aria-hidden="true">💸</span> {{ priceRange(suggestion.priceMin, suggestion.priceMax) }}</li>
        </ul>

        <div class="row place__foot">
          <span v-if="!suggestion.withinEveryonesReach" class="badge badge--wait">Too far for someone</span>
          <span v-if="!suggestion.fitsBudget" class="badge badge--wait">Outside the budget</span>
          <span v-if="suggestion.sample" class="badge" title="An invented place for demonstration">Sample</span>

          <span class="place__links">
            <a :href="mapLink(suggestion)" target="_blank" rel="noopener noreferrer">Map</a>
            <a
              v-if="safeWebsite(suggestion.website) !== null"
              :href="safeWebsite(suggestion.website) ?? undefined"
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
            </a>
            <span v-if="suggestion.phone" class="muted">{{ suggestion.phone }}</span>
          </span>
        </div>
      </li>
    </ol>

    <p v-if="event.suggestions.length > 0 && event.suggestedAt !== null" class="small muted places__basis">
      Based on where {{ considered === 1 ? '1 person is' : considered + ' people are' }} coming from ·
      suggested {{ date(event.suggestedAt) }} · distances as the crow flies
    </p>

    <div v-else-if="looked && event.suggestions.length === 0" class="empty" data-tst-id="suggestions-none">
      <p>No places for this activity were found near you yet.</p>
    </div>

    <div v-else-if="!looked" class="empty" data-tst-id="suggestions-not-yet">
      <p>
        Put your pin on the map above. Once everyone coming has done so, places appear here by
        themselves - or press "Suggest places" any time.
      </p>
    </div>
  </section>
</template>

<style scoped>
.places__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.places__title {
  margin-bottom: 0;
}

.places__problem {
  margin-bottom: 12px;
}

.places {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.place__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.place__rank {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--c-ink);
  color: var(--c-page);
  font-family: var(--font-display);
  font-weight: 700;
}

.place__name {
  font-size: 1.1rem;
  overflow-wrap: anywhere;
}

.place__rating {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--c-wait-soft);
  color: var(--c-wait);
  font-weight: 700;
  white-space: nowrap;
}

.place__about {
  margin-top: 10px;
  overflow-wrap: anywhere;
}

.place__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  color: var(--c-ink-soft);
  font-size: 0.92rem;
}

.place__foot {
  margin-top: 12px;
}

.place__links {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-left: auto;
  font-size: 0.92rem;
  font-weight: 600;
}

.places__basis {
  margin-top: 10px;
}
</style>
