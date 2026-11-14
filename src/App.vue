<script setup lang="ts">
import { toasts } from '@/stores/toast'
</script>

<template>
  <RouterView />

  <!-- Short messages: what was done, or what went wrong. -->
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toasts__item"
        :class="'toasts__item--' + toast.kind"
        data-tst-id="toast"
      >
        {{ toast.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 20px;
  z-index: 50;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 0 16px;
  pointer-events: none;
}

.toasts__item {
  max-width: 480px;
  padding: 12px 18px;
  border-radius: var(--radius-m);
  background: var(--c-ink);
  color: var(--c-page);
  box-shadow: var(--shadow-pop);
  font-size: 0.95rem;
}

.toasts__item--error {
  background: var(--c-danger);
  color: var(--c-on-accent);
}
</style>
