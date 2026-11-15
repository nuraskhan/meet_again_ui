<script setup lang="ts">
// How reliable a person is, as a small badge: "92% reliable".
//
// Below 50 the badge becomes the "Air" sticker: a person whose "I'm coming" is, more often than
// not, air. It says how much air: 100 minus the score.
// While there is too little history to judge by (the score is null) nothing is shown - a newcomer
// is not branded either way.

import { computed } from 'vue'
import { ShieldCheck, Wind } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** 0 to 100; null = too little history. */
    score: number | null
    /** Only the number and the icon: for a narrow place, such as a line on a card. */
    compact?: boolean
  }>(),
  { compact: false },
)

/** The share of promises that turned out to be air. */
const air = computed<number>(() => (props.score === null ? 0 : 100 - props.score))
const isAir = computed<boolean>(() => props.score !== null && props.score < 50)

const title = computed<string>(() =>
  props.score === null
    ? ''
    : isAir.value
      ? air.value + '% air: keeps ' + props.score + ' of 100 promises to come'
      : 'Keeps ' + props.score + ' of 100 promises to come',
)
</script>

<template>
  <span
    v-if="score !== null"
    class="hg-badge reliability"
    :class="isAir ? 'hg-badge--danger' : score >= 80 ? 'hg-badge--success' : 'hg-badge--warning'"
    :title="title"
    :aria-label="title"
    data-tst-id="reliability"
  >
    <template v-if="isAir">
      <Wind class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <span data-tst-id="reliability-air">{{ compact ? air + '% air' : 'Air · ' + air + '%' }}</span>
    </template>
    <template v-else>
      <ShieldCheck class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <span>{{ compact ? score + '%' : score + '% reliable' }}</span>
    </template>
  </span>
</template>

<style scoped>
.reliability {
  font-variant-numeric: tabular-nums;
}
</style>
