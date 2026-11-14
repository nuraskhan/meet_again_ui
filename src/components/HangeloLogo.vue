<script setup lang="ts">
// The logo: the letter H drawn as a path that starts at a location pin, and the word beside it.
// The drawing is the designers' (proto/hangelo-export/logo); its two colours come from the
// stylesheet (--c-brand-path, --c-brand-pin) and so follow the theme.

withDefaults(
  defineProps<{
    /** Show the word "hangelo" next to the mark. Off where there is room only for the mark. */
    word?: boolean
    /** One colour, the colour of the text around: for photos and coloured backgrounds. */
    mono?: boolean
    /** The side of the mark, in pixels. */
    size?: number
  }>(),
  { word: true, mono: false, size: 28 },
)
</script>

<template>
  <span class="hg-logo" :class="{ 'hg-logo--mono': mono }">
    <svg
      class="hg-logo__mark"
      viewBox="0 0 120 120"
      :width="size"
      :height="size"
      :style="{ width: size + 'px', height: size + 'px' }"
      :aria-hidden="word ? 'true' : undefined"
      :role="word ? undefined : 'img'"
      :aria-label="word ? undefined : 'Hangelo'"
    >
      <g class="hg-logo__path" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M66 10 C66 24 64 36 59 46 C53 58 44 66 34 65 C26 64 22 58 25 50" />
        <path d="M29 47 C38 43 48 42 60 42 L97 42 C110 42 112 25 102 21 C93 18 89 30 87 42 L80 108" />
      </g>
      <path
        class="hg-logo__pin"
        fill-rule="evenodd"
        d="M26 4 C35 4 42 11 42 20 C42 30 30 44 26 48 C22 44 10 30 10 20 C10 11 17 4 26 4 Z M26 15 a5 5 0 1 0 0.01 0 Z"
      />
    </svg>
    <span v-if="word" class="app-wide-only">hangelo</span>
  </span>
</template>
