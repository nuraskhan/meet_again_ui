<script setup lang="ts">
// The picture of a plan when it has no photograph of its own: one stock photograph per kind of
// activity - a sauna for a bath, cups for coffee, a path for a walk.
//
// The photographs are in src/assets/event (their sources and licence: CREDITS.md there). They
// are bundled with the application, not loaded from another site: a picture fetched from a
// foreign address would tell that address who is looking, and would vanish with it.
//
// It fills the box it is put into; the box decides the size and the shape.

import { computed, ref, watch } from 'vue'
import type { EventTypeCode } from '@/api/types'
import bath from '@/assets/event/bath.jpg'
import boardGames from '@/assets/event/board-games.jpg'
import bar from '@/assets/event/bar.jpg'
import cinema from '@/assets/event/cinema.jpg'
import coffee from '@/assets/event/coffee.jpg'
import food from '@/assets/event/food.jpg'
import other from '@/assets/event/other.jpg'
import sport from '@/assets/event/sport.jpg'
import walk from '@/assets/event/walk.jpg'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import { EVENT_TYPE_LOOK } from '@/lib/format'

const props = defineProps<{
  type: EventTypeCode
}>()

const PHOTOS: Record<EventTypeCode, string> = {
  BATH: bath,
  FOOD: food,
  COFFEE: coffee,
  BAR: bar,
  WALK: walk,
  CINEMA: cinema,
  SPORT: sport,
  BOARD_GAMES: boardGames,
  OTHER: other,
}

const source = computed<string>(() => PHOTOS[props.type] ?? other)
const label = computed<string>(() => EVENT_TYPE_LOOK[props.type]?.label ?? 'Plan')

/** The file failed to load: the icon of the activity stands in, so the box is never blank. */
const broken = ref<boolean>(false)

watch(source, () => {
  broken.value = false
})
</script>

<template>
  <span class="picture" data-tst-id="event-picture">
    <img
      v-if="!broken"
      class="picture__photo"
      :src="source"
      :alt="label"
      loading="lazy"
      decoding="async"
      @error="broken = true"
    />
    <span v-else class="picture__fallback" role="img" :aria-label="label">
      <EventTypeIcon :type="type" :size="48" />
    </span>
  </span>
</template>

<style scoped>
.picture {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--c-surface-strong);
}

.picture__photo {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
}

.picture__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--c-ink-soft);
}
</style>
