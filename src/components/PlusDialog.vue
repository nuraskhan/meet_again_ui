<script setup lang="ts">
// "Upgrade to Plus": what Hangelo Plus costs and gives, and the button that starts it.
//
// A DEMONSTRATION: no payment is taken, and the dialog says so. "Start Plus" switches the
// person's plan on the server; the "Plus" badge then appears by their name and the dialog closes.
//
// Nothing is limited on the free plan because of this: Plus only adds.

import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { api } from '@/api'
import { PLUS_FEATURES, PLUS_PRICE_MONTH, PLUS_PRICE_YEAR } from '@/lib/plus'
import { auth } from '@/stores/auth'
import { toastError, toastOk } from '@/stores/toast'

const emit = defineEmits<{
  close: []
}>()

const titleId: string = useId()
const busy = ref<boolean>(false)
const startButton = ref<HTMLButtonElement | null>(null)

/** What had the focus before the dialog opened: it gets it back. */
let opener: HTMLElement | null = null

onMounted(async () => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', onKey)
  await nextTick()
  startButton.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  opener?.focus()
})

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !busy.value) {
    emit('close')
  }
}

async function start(): Promise<void> {
  busy.value = true
  try {
    // The server answers with the profile as it is now: the plan in it is what the badge reads.
    auth.state.profile = await api.startPlus()
    toastOk('You are on Hangelo Plus')
    emit('close')
  } catch (caught) {
    toastError(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="hg-scrim plus" data-tst-id="plus-dialog" @click.self="!busy && emit('close')">
    <div class="hg-dialog plus__dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <button
        class="hg-iconbtn plus__close"
        type="button"
        aria-label="Close"
        :disabled="busy"
        data-tst-id="plus-close"
        @click="emit('close')"
      >
        <X class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      </button>

      <h2 :id="titleId" class="plus__title">Hangelo Plus</h2>
      <p class="plus__price hg-num" data-tst-id="plus-price">
        <b>{{ PLUS_PRICE_MONTH }}</b>/month or <b>{{ PLUS_PRICE_YEAR }}</b>/year
      </p>

      <ul class="plus__features">
        <li v-for="feature in PLUS_FEATURES" :key="feature" class="plus__feature">
          <Check class="hg-icon plus__check" :stroke-width="2" aria-hidden="true" />
          <span>{{ feature }}</span>
        </li>
      </ul>

      <button
        ref="startButton"
        class="hg-btn hg-btn--primary hg-btn--lg hg-btn--block"
        :class="{ 'is-loading': busy }"
        type="button"
        :disabled="busy"
        data-tst-id="plus-start"
        @click="start"
      >
        <span>Start Plus</span>
      </button>
      <p class="plus__note" data-tst-id="plus-note">Demo — no real payment</p>
    </div>
  </div>
</template>

<style scoped>
/* Over the whole page; under the toasts (z-index 50), so "You are on Plus" is seen. */
.plus {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.plus__dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  width: 400px;
  border: 1px solid var(--c-line);
}

.plus__close {
  position: absolute;
  top: var(--s-3);
  right: var(--s-3);
}

.plus__title {
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

.plus__price {
  margin-top: calc(var(--s-2) * -1);
  color: var(--c-ink-soft);
}

.plus__price b {
  color: var(--c-ink);
  font: var(--t-title-3);
}

.plus__features {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.plus__feature {
  display: flex;
  align-items: flex-start;
  gap: var(--s-2);
}

.plus__check {
  margin-top: 1px;
  color: var(--c-success);
}

.plus__note {
  margin-top: calc(var(--s-2) * -1);
  color: var(--c-ink-soft);
  font: var(--t-caption);
  text-align: center;
}

/* A phone: a sheet from the bottom. */
@media (max-width: 767px) {
  .plus {
    align-items: end;
    padding: 0;
  }

  .plus__dialog {
    width: 100%;
    border-radius: var(--r-l) var(--r-l) 0 0;
    padding-bottom: calc(var(--s-5) + env(safe-area-inset-bottom));
  }
}
</style>
