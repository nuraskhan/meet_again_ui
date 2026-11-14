<script setup lang="ts">
// The dates the creator offers, as a list. Shown where there is room for all of them; a card shows
// only the one-line summary.

import { dateTime } from '@/lib/format'

defineProps<{ times: string[] }>()
</script>

<template>
  <div v-if="times.length > 1" class="times" data-tst-id="proposed-times">
    <p class="times__title">Proposed dates</p>
    <ul class="times__list">
      <li v-for="time in times" :key="time" class="chip">
        <time :datetime="time">{{ dateTime(time) }}</time>
      </li>
    </ul>
    <p class="small muted">Agree on one in the chat.</p>
  </div>
</template>

<style scoped>
.times {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.times__title {
  font-size: 0.875rem;
  font-weight: 700;
}

.times__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
