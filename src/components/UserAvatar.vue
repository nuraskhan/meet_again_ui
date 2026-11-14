<script setup lang="ts">
// A person's picture, or their initials. The look is the designers' "hg-avatar": without a
// picture the initials stand on a neutral grey - the design keeps colour for actions only.

import { computed, ref, watch } from 'vue'
import { serverFileUrl } from '@/api/http'
import { initials } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    name: string
    /** Kept for the callers: the design no longer colours an avatar by the person. */
    userId?: number
    /** The server path of the uploaded picture, as the server gives it; anything else is ignored. */
    avatarUrl?: string | null
    /** The diameter in pixels. The design uses 24, 32, 40, 64 and 96. */
    size?: number
  }>(),
  { userId: 0, avatarUrl: null, size: 40 },
)

/** Only a picture kept by our server is ever loaded; see serverFileUrl. */
const source = computed<string | null>(() => serverFileUrl(props.avatarUrl))

/** The picture failed to load (removed meanwhile): fall back to the initials. */
const broken = ref<boolean>(false)

watch(source, () => {
  broken.value = false
})
</script>

<template>
  <span class="hg-avatar" :style="{ '--av': size + 'px' }" aria-hidden="true">
    <img v-if="source !== null && !broken" :src="source" alt="" @error="broken = true" />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>
