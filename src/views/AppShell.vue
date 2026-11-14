<script setup lang="ts">
// The frame of every page for a logged-in user: the bar with the navigation, and the page under it.

import UserAvatar from '@/components/UserAvatar.vue'
import { auth } from '@/stores/auth'

const NAV: { name: string; label: string; icon: string }[] = [
  { name: 'plans', label: 'Plans', icon: '🗓' },
  { name: 'friends', label: 'Friends', icon: '👋' },
  { name: 'chats', label: 'Chats', icon: '💬' },
]
</script>

<template>
  <div class="shell">
    <header class="shell__bar">
      <div class="shell__inner">
        <RouterLink class="shell__logo" :to="{ name: 'plans' }">meet again</RouterLink>

        <nav class="shell__nav" aria-label="Main">
          <RouterLink
            v-for="item in NAV"
            :key="item.name"
            class="shell__link"
            active-class="shell__link--active"
            :to="{ name: item.name }"
            :data-tst-id="'nav-' + item.name"
          >
            <span aria-hidden="true">{{ item.icon }}</span>
            <span class="shell__label">{{ item.label }}</span>
          </RouterLink>
        </nav>

        <RouterLink
          class="shell__me"
          :to="{ name: 'profile' }"
          aria-label="My profile"
          data-tst-id="nav-profile"
        >
          <UserAvatar
            :name="auth.state.profile?.displayName ?? '?'"
            :user-id="auth.state.userId ?? 0"
            :avatar-url="auth.state.profile?.avatarUrl"
            :size="36"
          />
        </RouterLink>
      </div>
    </header>

    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
.shell__bar {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--c-line);
  background: color-mix(in srgb, var(--c-page) 88%, transparent);
  backdrop-filter: blur(10px);
}

.shell__inner {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 880px;
  min-height: 60px;
  margin: 0 auto;
  padding: 0 16px;
}

.shell__logo {
  color: var(--c-ink);
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.shell__nav {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  gap: 4px;
}

.shell__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  color: var(--c-ink-soft);
  font-weight: 600;
}

.shell__link:hover {
  background: var(--c-surface-soft);
  color: var(--c-ink);
}

.shell__link--active,
.shell__link--active:hover {
  background: var(--c-accent-soft);
  color: var(--c-accent);
}

.shell__me {
  display: inline-flex;
  border-radius: 50%;
}

/* On a phone the bar keeps the icons and drops the words and the wordmark. */
@media (max-width: 520px) {
  .shell__logo {
    display: none;
  }

  .shell__nav {
    justify-content: flex-start;
  }
}

@media (max-width: 380px) {
  .shell__label {
    display: none;
  }
}
</style>
