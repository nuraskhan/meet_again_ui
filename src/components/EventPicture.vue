<script setup lang="ts">
// The picture of a plan when it has no photograph of its own: one drawn scene per kind of
// activity - a bathhouse for a bath, cups for coffee, a path for a walk.
//
// WHY drawn here and not photographs: photographs of real venues belong to their authors, and we
// have none of our own. The scenes are simple shapes in a few warm colours per activity, made for
// this application. They are pictures, not interface: their colours are their own (the design's
// "colour means action" rule is about controls), but each sits on a tint that follows the theme.

import { computed } from 'vue'
import type { EventTypeCode } from '@/api/types'
import { EVENT_TYPE_LOOK } from '@/lib/format'

const props = defineProps<{
  type: EventTypeCode
}>()

/** Two colours per activity: the main shape and its companion. */
const PALETTE: Record<EventTypeCode, { a: string; b: string }> = {
  BATH: { a: '#b5651d', b: '#e8b98a' },
  FOOD: { a: '#c0392b', b: '#f2c078' },
  COFFEE: { a: '#6f4e37', b: '#d9b99b' },
  BAR: { a: '#7d3c98', b: '#f1c40f' },
  WALK: { a: '#2e7d4f', b: '#a8d5a2' },
  CINEMA: { a: '#34495e', b: '#e74c3c' },
  SPORT: { a: '#1f6f8b', b: '#f39c12' },
  BOARD_GAMES: { a: '#8e5a2b', b: '#e6c229' },
  OTHER: { a: '#8a5a2b', b: '#e5252a' },
}

const colours = computed(() => PALETTE[props.type] ?? PALETTE.OTHER)
const label = computed<string>(() => EVENT_TYPE_LOOK[props.type]?.label ?? 'Plan')
</script>

<template>
  <svg
    class="picture"
    viewBox="0 0 320 180"
    preserveAspectRatio="xMidYMid slice"
    role="img"
    :aria-label="label"
    :style="{ '--pa': colours.a, '--pb': colours.b }"
    data-tst-id="event-picture"
  >
    <rect class="picture__sky" width="320" height="180" />
    <!-- A soft sun or lamp behind every scene. -->
    <circle class="picture__glow" cx="250" cy="48" r="64" />
    <rect class="picture__ground" y="132" width="320" height="48" />

    <!-- Bathhouse: a log cabin with steam. -->
    <g v-if="type === 'BATH'">
      <path class="pa" d="M92 132 V84 L160 44 L228 84 V132 Z" />
      <path class="pb" d="M82 88 L160 40 L238 88 L230 96 L160 54 L90 96 Z" />
      <rect class="picture__sky" x="146" y="96" width="28" height="36" rx="3" />
      <path class="line" d="M112 104 H138 M112 116 H138 M182 104 H208 M182 116 H208" />
      <path class="steam" d="M196 40 C188 30 204 24 196 14 M214 46 C206 36 222 30 214 20" />
    </g>

    <!-- Food: a plate with a fork and a knife. -->
    <g v-else-if="type === 'FOOD'">
      <ellipse class="pb" cx="160" cy="112" rx="70" ry="22" />
      <ellipse class="picture__sky" cx="160" cy="108" rx="48" ry="14" />
      <path class="pa" d="M128 104 C138 84 182 84 192 104 Z" />
      <path class="line" d="M74 70 V124 M66 70 V88 C66 96 82 96 82 88 V70" />
      <path class="line" d="M246 70 V124 M246 70 C258 78 258 96 246 100" />
    </g>

    <!-- Coffee: two cups with steam. -->
    <g v-else-if="type === 'COFFEE'">
      <path class="pa" d="M96 86 H160 V112 C160 126 148 134 128 134 C108 134 96 126 96 112 Z" />
      <path class="line" d="M160 94 C176 94 176 114 160 114" />
      <path class="pb" d="M184 98 H232 V116 C232 128 222 134 208 134 C194 134 184 128 184 116 Z" />
      <path class="line" d="M232 104 C244 104 244 120 232 120" />
      <path class="steam" d="M118 74 C110 64 126 58 118 48 M140 74 C132 64 148 58 140 48 M208 88 C202 80 214 76 208 68" />
    </g>

    <!-- Bar: a cocktail glass and a bottle. -->
    <g v-else-if="type === 'BAR'">
      <path class="pb" d="M108 60 H188 L148 104 Z" />
      <path class="line" d="M148 104 V132 M126 132 H170 M168 52 L156 72" />
      <circle class="pa" cx="170" cy="50" r="7" />
      <path class="pa" d="M214 132 V86 C214 78 220 76 220 66 V48 H232 V66 C232 76 238 78 238 86 V132 Z" />
    </g>

    <!-- Walk: hills, a winding path and a tree. -->
    <g v-else-if="type === 'WALK'">
      <path class="pb" d="M0 132 C50 84 96 84 140 132 Z" />
      <path class="pa" d="M110 132 C170 66 236 66 320 132 Z" />
      <path class="path" d="M150 180 C150 156 196 154 190 138 C186 126 214 122 216 108" />
      <path class="line" d="M70 132 V104" />
      <circle class="pa" cx="70" cy="92" r="18" />
    </g>

    <!-- Cinema: a screen, a clapperboard stripe and rows of seats. -->
    <g v-else-if="type === 'CINEMA'">
      <rect class="pa" x="70" y="36" width="180" height="74" rx="6" />
      <rect class="picture__sky" x="80" y="46" width="160" height="54" rx="3" />
      <path class="pb" d="M146 60 L182 73 L146 86 Z" />
      <path class="pb" d="M60 132 a14 14 0 0 1 28 0 Z M100 132 a14 14 0 0 1 28 0 Z M146 132 a14 14 0 0 1 28 0 Z M192 132 a14 14 0 0 1 28 0 Z M232 132 a14 14 0 0 1 28 0 Z" />
    </g>

    <!-- Sport: a ball over a net and a court line. -->
    <g v-else-if="type === 'SPORT'">
      <path class="line" d="M160 132 V70 M100 82 H220 M100 82 V132 M220 82 V132 M100 98 H220 M100 114 H220 M130 82 V132 M190 82 V132" />
      <circle class="pb" cx="206" cy="46" r="20" />
      <path class="line" d="M190 34 C200 44 212 44 222 34 M190 58 C200 48 212 48 222 58" />
      <path class="pa" d="M40 132 H280 V140 H40 Z" />
    </g>

    <!-- Board games: a board, two dice and a pawn. -->
    <g v-else-if="type === 'BOARD_GAMES'">
      <path class="pa" d="M70 132 L110 84 H230 L262 132 Z" />
      <path class="line" d="M96 100 H246 M84 116 H254 M150 84 L138 132 M190 84 L202 132" />
      <rect class="pb" x="112" y="48" width="30" height="30" rx="6" transform="rotate(-10 127 63)" />
      <circle class="picture__sky" cx="120" cy="56" r="3" /><circle class="picture__sky" cx="134" cy="70" r="3" />
      <rect class="pb" x="150" y="56" width="26" height="26" rx="5" transform="rotate(12 163 69)" />
      <circle class="picture__sky" cx="163" cy="69" r="3" />
      <path class="pb" d="M212 108 C212 92 204 90 204 80 a10 10 0 1 1 20 0 C224 90 216 92 216 108 Z" />
    </g>

    <!-- Something else: the path and the pin of the logo. -->
    <g v-else>
      <path class="path" d="M60 150 C100 120 110 150 150 118 C186 90 190 120 236 84" />
      <path class="pb" fill-rule="evenodd" d="M236 34 C250 34 260 44 260 58 C260 74 242 92 236 98 C230 92 212 74 212 58 C212 44 222 34 236 34 Z M236 50 a8 8 0 1 0 0.01 0 Z" />
      <circle class="pa" cx="60" cy="150" r="7" />
    </g>
  </svg>
</template>

<style scoped>
.picture {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--c-surface-soft);
}

/* The backdrop follows the theme; the scene keeps its own colours on it. */
.picture__sky {
  fill: var(--c-surface-soft);
}

.picture__ground {
  fill: var(--c-surface-strong);
}

.picture__glow {
  fill: var(--pb);
  opacity: 0.28;
}

.pa {
  fill: var(--pa);
}

.pb {
  fill: var(--pb);
}

.line,
.steam,
.path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line {
  stroke: var(--c-ink);
  stroke-width: 3;
  opacity: 0.55;
}

.steam {
  stroke: var(--c-ink-soft);
  stroke-width: 3;
  opacity: 0.6;
}

.path {
  stroke: var(--pa);
  stroke-width: 7;
  stroke-dasharray: 2 13;
}
</style>
