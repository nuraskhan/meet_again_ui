<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'
import { toasts } from '@/stores/toast'
</script>

<template>
  <RouterView />

  <!-- Short messages: what was done, or what went wrong. -->
  <div class="app-toasts" aria-live="polite">
    <TransitionGroup name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="hg-toast"
        :class="{ 'hg-toast--error': toast.kind === 'error' }"
        data-tst-id="toast"
      >
        <CircleAlert v-if="toast.kind === 'error'" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <p>{{ toast.text }}</p>
      </div>
    </TransitionGroup>
  </div>
</template>
