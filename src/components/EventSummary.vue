<script setup lang="ts">
// The heart of an invitation: what, when, how far, how much. Used on cards and on the plan page.

import type { EventDto } from '@/api/types'
import { distanceRange, EVENT_TYPE_LOOK, priceRange, startsAt } from '@/lib/format'

defineProps<{ event: EventDto }>()
</script>

<template>
  <div class="summary">
    <span class="summary__icon" aria-hidden="true">{{ EVENT_TYPE_LOOK[event.eventType].icon }}</span>

    <div class="grow">
      <div class="summary__kind">{{ EVENT_TYPE_LOOK[event.eventType].label }}</div>
      <h3 class="summary__title">{{ event.title }}</h3>

      <ul class="summary__facts">
        <li><span aria-hidden="true">🗓</span> {{ startsAt(event.startsAt) }}</li>
        <li><span aria-hidden="true">📍</span> {{ distanceRange(event.distanceMinKm, event.distanceMaxKm) }}</li>
        <li><span aria-hidden="true">💸</span> {{ priceRange(event.priceMin, event.priceMax) }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  gap: 14px;
}

.summary__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-m);
  background: var(--c-accent-soft);
  font-size: 1.6rem;
}

.summary__kind {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-accent);
}

.summary__title {
  margin-top: 2px;
  font-size: 1.15rem;
  overflow-wrap: anywhere;
}

.summary__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  color: var(--c-ink-soft);
  font-size: 0.92rem;
}
</style>
