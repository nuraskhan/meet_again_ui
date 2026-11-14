<script setup lang="ts">
// The line icon of an activity type. One place decides which icon stands for which activity, so
// a type looks the same on a card, in the form and on a chip.

import { computed } from 'vue'
import type { Component } from 'vue'
import {
  Bath,
  Clapperboard,
  Coffee,
  Dices,
  Dumbbell,
  Footprints,
  Martini,
  Sparkles,
  Utensils,
} from 'lucide-vue-next'
import type { EventTypeCode } from '@/api/types'

const props = withDefaults(
  defineProps<{
    type: EventTypeCode
    /** The side in pixels: 16 in a line of small text, 20 in text, 24 alone, 48 in an empty photo. */
    size?: number
  }>(),
  { size: 20 },
)

const ICONS: Record<EventTypeCode, Component> = {
  BATH: Bath,
  FOOD: Utensils,
  COFFEE: Coffee,
  BAR: Martini,
  WALK: Footprints,
  CINEMA: Clapperboard,
  SPORT: Dumbbell,
  BOARD_GAMES: Dices,
  OTHER: Sparkles,
}

const icon = computed<Component>(() => ICONS[props.type] ?? Sparkles)
</script>

<template>
  <component
    :is="icon"
    class="hg-icon"
    :style="{ width: size + 'px', height: size + 'px' }"
    :stroke-width="1.5"
    aria-hidden="true"
  />
</template>
