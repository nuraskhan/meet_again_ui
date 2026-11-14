<script setup lang="ts">
// The switch between the light and the dark theme. It shows the theme it leads to: a moon while
// the page is light, a sun while it is dark.

import { Moon, Sun } from 'lucide-vue-next'
import { theme, toggleTheme } from '@/stores/theme'
</script>

<template>
  <button
    class="hg-iconbtn"
    type="button"
    :aria-label="theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'"
    :title="theme === 'dark' ? 'Light theme' : 'Dark theme'"
    :aria-pressed="theme === 'dark'"
    data-tst-id="theme-toggle"
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
    <Moon v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
  </button>
</template>
