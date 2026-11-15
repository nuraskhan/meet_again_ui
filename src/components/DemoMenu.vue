<script setup lang="ts">
// "Try demo": a button that opens a small menu - sign in as Steve Jobs or as Steve Wozniak.
//
// The two are ready demonstration accounts, friends with each other; choosing one opens the
// application as that person, with no registration (the /fl/... links, views/DemoLoginView.vue).
// Two accounts and not one, so that the product can be shown from both sides: open one in each of
// two browsers and invite one from the other.
//
// The button is meant to be noticed: it carries the accent and a slow pulse. The pulse stops for
// people who asked their system for less motion, and once the menu has been opened.

import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { ChevronDown, Play } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    /** A larger button: for the middle of a page rather than a bar. */
    large?: boolean
    /** Which edge of the button the menu lines up with. */
    align?: 'left' | 'right' | 'center'
  }>(),
  { large: false, align: 'left' },
)

const DEMOS: { who: string; name: string; initials: string; note: string }[] = [
  { who: 'steve-jobs', name: 'Steve Jobs', initials: 'SJ', note: 'Organises the plans' },
  { who: 'steve-wozniak', name: 'Steve Wozniak', initials: 'SW', note: 'Gets invited' },
]

const open = ref<boolean>(false)
/** Opened at least once: the button has been found, so it stops calling for attention. */
const found = ref<boolean>(false)
const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const menuId: string = useId()

/** How far the menu is moved sideways, in pixels, so that it stays on the screen. */
const shift = ref<number>(0)
/** The least distance kept between the menu and the edge of the screen. */
const EDGE = 12

async function toggle(): Promise<void> {
  open.value = !open.value
  found.value = true
  if (open.value) {
    // On a phone the button can stand anywhere in the bar, and a menu lined up with it would run
    // off the screen: it is measured once it is there, and moved back in.
    shift.value = 0
    await nextTick()
    const box = list.value?.getBoundingClientRect()
    if (box !== undefined) {
      const width: number = document.documentElement.clientWidth
      if (box.right > width - EDGE) {
        shift.value = width - EDGE - box.right
      } else if (box.left < EDGE) {
        shift.value = EDGE - box.left
      }
    }
  }
}

/** A click anywhere else closes the menu. */
function onDocumentClick(event: MouseEvent): void {
  if (open.value && root.value !== null && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    root.value?.querySelector<HTMLButtonElement>('button')?.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="demo-menu" :class="'demo-menu--' + align">
    <button
      class="hg-btn hg-btn--primary demo-menu__button"
      :class="{ 'hg-btn--lg': large, 'demo-menu__button--calling': !found }"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="menuId"
      data-tst-id="demo-menu-button"
      @click="toggle"
    >
      <Play class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      <span>Try demo</span>
      <ChevronDown
        class="hg-icon demo-menu__chevron"
        :class="{ 'demo-menu__chevron--open': open }"
        :stroke-width="1.5"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="open"
      :id="menuId"
      ref="list"
      class="demo-menu__list"
      :style="{ marginLeft: shift + 'px' }"
      role="menu" aria-label="Sign in to the demo as" data-tst-id="demo-menu">
      <p class="demo-menu__title">Sign in as</p>
      <RouterLink
        v-for="demo in DEMOS"
        :key="demo.who"
        class="demo-menu__item"
        role="menuitem"
        :to="{ name: 'demo-login', params: { who: demo.who } }"
        :data-tst-id="'demo-menu-' + demo.who"
      >
        <span class="hg-avatar hg-avatar--32" aria-hidden="true">{{ demo.initials }}</span>
        <span class="demo-menu__who">
          <span class="demo-menu__name">{{ demo.name }}</span>
          <span class="demo-menu__note">{{ demo.note }}</span>
        </span>
      </RouterLink>
      <p class="demo-menu__foot">No sign-up. The two are friends: open each in its own browser.</p>
    </div>
  </div>
</template>

<style scoped>
.demo-menu {
  position: relative;
  display: inline-flex;
}

/* The pulse: a ring of the accent that grows and fades, slowly, behind the button. */
.demo-menu__button--calling::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 0 var(--c-accent);
  opacity: 0.55;
  animation: demo-menu-pulse 2200ms var(--ease) infinite;
  pointer-events: none;
}

@keyframes demo-menu-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--c-accent);
    opacity: 0.55;
  }

  70%,
  100% {
    box-shadow: 0 0 0 12px var(--c-accent);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo-menu__button--calling::before {
    animation: none;
    opacity: 0;
  }
}

.demo-menu__chevron {
  width: 16px;
  height: 16px;
  transition: transform var(--dur-2) var(--ease);
}

.demo-menu__chevron--open {
  transform: rotate(180deg);
}

.demo-menu__list {
  position: absolute;
  top: calc(100% + var(--s-2));
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 260px;
  max-width: calc(100vw - 24px);
  padding: var(--s-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-m);
  background: var(--c-surface);
  box-shadow: var(--shadow-2);
  text-align: left;
}

.demo-menu--left .demo-menu__list {
  left: 0;
}

.demo-menu--right .demo-menu__list {
  right: 0;
}

.demo-menu--center .demo-menu__list {
  left: 50%;
  transform: translateX(-50%);
}

.demo-menu__title,
.demo-menu__foot {
  padding: var(--s-1) var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-caption);
}

.demo-menu__item,
.demo-menu__item:hover {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-2);
  border-radius: var(--r-s);
  color: var(--c-ink);
}

.demo-menu__item:hover,
.demo-menu__item:focus-visible {
  background: var(--c-surface-soft);
}

.demo-menu__who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.demo-menu__name {
  font: var(--t-body-strong);
}

.demo-menu__note {
  color: var(--c-ink-soft);
  font: var(--t-small);
}
</style>
