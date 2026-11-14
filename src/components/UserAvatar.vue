<script setup lang="ts">
// A person's picture, or their initials on a colour that is always the same for the same person.

import { computed, ref, watch } from 'vue'
import { serverFileUrl } from '@/api/http'
import { initials } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    name: string
    /** Decides the colour, so one person looks the same everywhere. */
    userId: number
    /** The server path of the uploaded picture, as the server gives it; anything else is ignored. */
    avatarUrl?: string | null
    size?: number
  }>(),
  { avatarUrl: null, size: 40 },
)

// Six hues spread around the wheel; saturation and lightness are fixed so the white letters stay
// readable on every one of them.
const HUES: number[] = [14, 42, 168, 204, 262, 330]

const background = computed<string>(() => {
  const hue: number = HUES[Math.abs(props.userId) % HUES.length] ?? 14
  return 'hsl(' + hue + ' 55% 42%)'
})

/** Only a picture kept by our server is ever loaded; see serverFileUrl. */
const source = computed<string | null>(() => serverFileUrl(props.avatarUrl))

/** The picture failed to load (removed meanwhile): fall back to the initials. */
const broken = ref<boolean>(false)

watch(source, () => {
  broken.value = false
})
</script>

<template>
  <span
    class="avatar"
    :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.4 + 'px', background }"
    aria-hidden="true"
  >
    <img v-if="source !== null && !broken" class="avatar__image" :src="source" alt="" @error="broken = true" />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  color: #ffffff; /* always on a dark, saturated background, in both themes */
  font-weight: 700;
  letter-spacing: 0.02em;
  user-select: none;
}

.avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
