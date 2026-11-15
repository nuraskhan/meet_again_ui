<script setup lang="ts">
// "What's next" on the plan page: the steps of the plan as a short list - done ones ticked, the
// one to do now opened with a sentence and its button (the default slot, filled by the page, which
// owns the actions). When everything is done the list folds into one line (the "done" slot).

import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { nextStep, type PlanStep } from '@/lib/planSteps'

const props = defineProps<{ steps: PlanStep[] }>()

const current = computed<PlanStep | null>(() => nextStep(props.steps))
/** "Step 2 of 3": where the step to do now stands in the list. */
const position = computed<number>(() => props.steps.findIndex((step) => step.id === current.value?.id) + 1)
</script>

<template>
  <section
    v-if="steps.length > 0"
    class="hg-card steps"
    :class="{ 'hg-card--accent': current !== null }"
    aria-label="What's next"
    data-tst-id="plan-steps"
  >
    <!-- Everything is done: one quiet line. -->
    <div v-if="current === null" class="steps__done" data-tst-id="plan-steps-done">
      <span class="steps__mark steps__mark--done" aria-hidden="true">
        <Check class="hg-icon" :stroke-width="2" />
      </span>
      <slot name="done" />
    </div>

    <template v-else>
      <div class="steps__head">
        <h2 class="steps__title">What's next</h2>
        <span class="steps__count hg-num">Step {{ position }} of {{ steps.length }}</span>
      </div>

      <ol class="steps__list">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="steps__item"
          :class="{ 'steps__item--done': step.done, 'steps__item--current': step.id === current.id }"
          :aria-current="step.id === current.id ? 'step' : undefined"
          :data-tst-id="'plan-step-' + step.id"
        >
          <span class="steps__mark" :class="{ 'steps__mark--done': step.done }" aria-hidden="true">
            <Check v-if="step.done" class="hg-icon" :stroke-width="2" />
            <template v-else>{{ index + 1 }}</template>
          </span>

          <div class="steps__body">
            <p class="steps__name">
              {{ step.title }}
              <span v-if="step.done" class="hg-sr">(done)</span>
            </p>

            <template v-if="step.id === current.id">
              <p class="steps__hint">{{ step.hint }}</p>
              <div class="steps__actions">
                <slot :step="step" />
              </div>
            </template>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.steps {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
}

.steps__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}

.steps__title {
  font: var(--t-title-3);
}

.steps__count {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

.steps__list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps__item {
  display: flex;
  align-items: flex-start;
  gap: var(--s-3);
  color: var(--c-ink-soft);
}

.steps__item--current {
  padding: var(--s-2) 0;
  color: var(--c-ink);
}

/* The number of the step in a circle; a tick once it is done. */
.steps__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--s-5);
  height: var(--s-5);
  border: 1px solid var(--c-ink-faint);
  border-radius: var(--r-full);
  font: var(--t-small);
  font-variant-numeric: tabular-nums;
}

.steps__mark .hg-icon {
  width: var(--s-4);
  height: var(--s-4);
}

.steps__mark--done {
  border-color: transparent;
  background: var(--c-success-soft);
  color: var(--c-success);
}

.steps__item--current .steps__mark {
  border-color: transparent;
  background: var(--c-accent);
  color: var(--c-on-accent);
  font-weight: 600;
}

.steps__body {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--s-2);
  min-width: 0;
}

/* One line high as the circle, so the text stands level with its number. */
.steps__name {
  min-height: var(--s-5);
  line-height: var(--s-5);
}

.steps__item--current .steps__name {
  font: var(--t-body-strong);
  line-height: var(--s-5);
}

.steps__hint {
  max-width: 60ch;
  color: var(--c-ink-soft);
}

.steps__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: var(--s-1);
}

.steps__done {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
}

@media (max-width: 767px) {
  .steps {
    padding: var(--s-4);
  }

  /* A lone button, or a pair, takes the whole width: easy to hit with a thumb. */
  .steps__actions :deep(.hg-btn) {
    flex: 1 1 0;
  }
}
</style>
