<script setup lang="ts">
// The heart of an invitation: what, when, how far, how much. Used on cards, on the plan page and
// on the page a link opens. The look is the designers' "hg-plan": the kind with its line icon, the
// title, then the facts with a clock, a map pin and a wallet.

import { Clock, MapPin, Wallet } from 'lucide-vue-next'
import type { EventFacts } from '@/api/types'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import { distanceRange, EVENT_TYPE_LOOK, priceRange, proposedTimesSummary } from '@/lib/format'

withDefaults(
  defineProps<{
    event: EventFacts
    /**
     * "compact" for a card in a list: a small title and the facts in one wrapping line.
     * "full" for the page of one plan: the title is the heading of the page, a fact per line.
     */
    variant?: 'compact' | 'full'
  }>(),
  { variant: 'compact' },
)
</script>

<template>
  <div class="hg-plan" :class="'hg-plan--' + variant">
    <span class="hg-plan__kind">
      <EventTypeIcon :type="event.eventType" :size="16" />
      {{ EVENT_TYPE_LOOK[event.eventType].label }}
    </span>

    <!-- On the page of one plan the title of the plan is the title of the page. -->
    <component :is="variant === 'full' ? 'h1' : 'h3'" class="hg-plan__title summary__title">
      {{ event.title }}
    </component>

    <ul class="hg-plan__facts">
      <li class="hg-plan__fact" data-tst-id="summary-when">
        <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        {{ proposedTimesSummary(event.proposedTimes) }}
      </li>
      <li class="hg-plan__fact">
        <MapPin class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        {{ distanceRange(event.distanceMinMi, event.distanceMaxMi) }}
      </li>
      <li class="hg-plan__fact">
        <Wallet class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        {{ priceRange(event.priceMin, event.priceMax) }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* A title is typed by a person: one long word must not push the card wider than the screen. */
.summary__title {
  overflow-wrap: anywhere;
}
</style>
