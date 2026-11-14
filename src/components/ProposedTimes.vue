<script setup lang="ts">
// The dates the creator offers, one per line. Shown where there is room for all of them; a card
// shows only the one-line summary. With one date or none the summary already says everything, so
// nothing is rendered.

import { Clock } from 'lucide-vue-next'
import { dateTime } from '@/lib/format'

defineProps<{ times: string[] }>()
</script>

<template>
  <ul v-if="times.length > 1" class="hg-plan__facts" aria-label="Proposed dates" data-tst-id="proposed-times">
    <li v-for="time in times" :key="time" class="hg-plan__fact">
      <Clock class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <time :datetime="time">{{ dateTime(time) }}</time>
    </li>
  </ul>
</template>
