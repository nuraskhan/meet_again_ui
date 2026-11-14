<script setup lang="ts">
// The frame of every page for a logged-in user. Three forms of one thing, chosen by the width of
// the screen (the rules are in assets/main.css, "the frame"):
//   wide    - a sidebar with the logo, "New plan", the navigation and the account;
//   medium  - the same sidebar collapsed to icons;
//   phone   - a bar at the top (logo, bell, account) and a tab bar at the bottom.

import type { Component } from 'vue'
import { Bell, Calendar, Compass, MessageCircle, Plus, Users } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import HangeloLogo from '@/components/HangeloLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import VerifyEmailBanner from '@/components/VerifyEmailBanner.vue'
import { auth } from '@/stores/auth'
import { notifications } from '@/stores/notifications'

const route = useRoute()

const NAV: { name: string; label: string; icon: Component }[] = [
  { name: 'feed', label: 'Feed', icon: Compass },
  { name: 'plans', label: 'Plans', icon: Calendar },
  { name: 'friends', label: 'Friends', icon: Users },
  { name: 'chats', label: 'Chats', icon: MessageCircle },
]

/**
 * Which navigation item the current page belongs to: a plan is under "Plans", a chat under
 * "Chats", a person under "Friends".
 */
function isCurrent(name: string): boolean {
  const current: string = String(route.name ?? '')
  if (name === 'plans') {
    return current === 'plans' || current === 'plan' || current === 'plan-new'
  }
  if (name === 'chats') {
    return current === 'chats' || current === 'chat'
  }
  if (name === 'friends') {
    return current === 'friends' || current === 'person'
  }
  return current === name
}

/** The number on the bell: "9+" beyond nine, so the pill stays small. */
function unreadLabel(): string {
  return notifications.state.unread > 9 ? '9+' : String(notifications.state.unread)
}

function bellName(): string {
  return notifications.state.unread > 0
    ? 'Notifications, ' + notifications.state.unread + ' unread'
    : 'Notifications'
}
</script>

<template>
  <div class="app-shell">
    <!-- Wide and medium screens -->
    <aside class="hg-sidebar app-shell__side">
      <RouterLink class="shell__logo" :to="{ name: 'plans' }" aria-label="Hangelo, my plans">
        <HangeloLogo />
      </RouterLink>

      <RouterLink
        class="hg-btn hg-btn--primary hg-btn--block"
        :to="{ name: 'plan-new' }"
        title="New plan"
        data-tst-id="nav-plan-new"
      >
        <Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span class="app-wide-only">New plan</span>
      </RouterLink>

      <nav class="hg-nav" aria-label="Main">
        <RouterLink
          v-for="item in NAV"
          :key="item.name"
          class="hg-navitem"
          :to="{ name: item.name }"
          :aria-current="isCurrent(item.name) ? 'page' : undefined"
          :title="item.label"
          :data-tst-id="'nav-' + item.name"
        >
          <component :is="item.icon" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span class="hg-navitem__label app-wide-only">{{ item.label }}</span>
        </RouterLink>

        <RouterLink
          class="hg-navitem"
          :to="{ name: 'notifications' }"
          :aria-current="isCurrent('notifications') ? 'page' : undefined"
          :aria-label="bellName()"
          title="Notifications"
          data-tst-id="nav-notifications"
        >
          <Bell class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span class="hg-navitem__label app-wide-only">Notifications</span>
          <span
            v-if="notifications.state.unread > 0"
            class="hg-count"
            aria-hidden="true"
            data-tst-id="nav-notifications-unread"
          >
            {{ unreadLabel() }}
          </span>
        </RouterLink>
      </nav>

      <!-- Wide screens have no top bar: the switch sits at the foot of the sidebar. -->
      <span class="shell__theme"><ThemeToggle /></span>

      <RouterLink class="hg-account" :to="{ name: 'profile' }" title="My profile" data-tst-id="nav-profile">
        <UserAvatar
          :name="auth.state.profile?.displayName ?? '?'"
          :avatar-url="auth.state.profile?.avatarUrl"
          :size="32"
        />
        <span class="shell__account app-wide-only">
          <b class="shell__name">{{ auth.state.profile?.displayName ?? '' }}</b>
          <span class="shell__hint">View profile</span>
        </span>
      </RouterLink>
    </aside>

    <!-- Phone: the bar at the top -->
    <header class="hg-topbar app-shell__top">
      <RouterLink class="shell__logo app-grow" :to="{ name: 'plans' }" aria-label="Hangelo, my plans">
        <HangeloLogo />
      </RouterLink>

      <ThemeToggle />

      <RouterLink
        class="hg-iconbtn hg-bell"
        :to="{ name: 'notifications' }"
        :aria-label="bellName()"
        data-tst-id="nav-notifications-phone"
      >
        <Bell class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span v-if="notifications.state.unread > 0" class="hg-count" aria-hidden="true">{{ unreadLabel() }}</span>
      </RouterLink>

      <RouterLink class="shell__me" :to="{ name: 'profile' }" aria-label="My profile" data-tst-id="nav-profile-phone">
        <UserAvatar
          :name="auth.state.profile?.displayName ?? '?'"
          :avatar-url="auth.state.profile?.avatarUrl"
          :size="32"
        />
      </RouterLink>
    </header>

    <main class="app-main">
      <!-- Not on the chat pages: they fill the screen exactly, and a banner above would push the
           message field off it. -->
      <div v-if="route.name !== 'chat' && route.name !== 'chats'" class="app-col app-col--rail">
        <VerifyEmailBanner />
      </div>

      <RouterView v-slot="{ Component: page }">
        <Transition name="fade" mode="out-in">
          <component :is="page" />
        </Transition>
      </RouterView>
    </main>

    <!-- Phone: the tab bar at the bottom. Not inside a chat: its message field sits there. -->
    <nav v-if="route.name !== 'chat'" class="hg-tabbar app-shell__tabs" aria-label="Main">
      <RouterLink
        class="hg-tab"
        :to="{ name: 'feed' }"
        :aria-current="isCurrent('feed') ? 'page' : undefined"
        data-tst-id="tab-feed"
      >
        <Compass class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span>Feed</span>
      </RouterLink>
      <RouterLink
        class="hg-tab"
        :to="{ name: 'plans' }"
        :aria-current="isCurrent('plans') ? 'page' : undefined"
        data-tst-id="tab-plans"
      >
        <Calendar class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span>Plans</span>
      </RouterLink>
      <RouterLink class="hg-tab" :to="{ name: 'plan-new' }" aria-label="New plan" data-tst-id="tab-plan-new">
        <span class="hg-tab__new"><Plus class="hg-icon" :stroke-width="1.5" aria-hidden="true" /></span>
      </RouterLink>
      <RouterLink
        class="hg-tab"
        :to="{ name: 'friends' }"
        :aria-current="isCurrent('friends') ? 'page' : undefined"
        data-tst-id="tab-friends"
      >
        <Users class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span>Friends</span>
      </RouterLink>
      <RouterLink
        class="hg-tab"
        :to="{ name: 'chats' }"
        :aria-current="isCurrent('chats') ? 'page' : undefined"
        data-tst-id="tab-chats"
      >
        <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span>Chats</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.shell__logo {
  display: inline-flex;
  padding: 0 var(--s-2);
  color: var(--c-ink);
}

.shell__account {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shell__name {
  overflow: hidden;
  font: var(--t-body-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shell__hint {
  color: var(--c-ink-soft);
  font: var(--t-small);
}

/* Pushed to the foot of the sidebar, right above the account (which no longer needs the push). */
.shell__theme {
  display: flex;
  margin-top: auto;
}

.shell__theme + .hg-account {
  margin-top: 0;
}

.shell__me {
  display: inline-flex;
  border-radius: var(--r-full);
}

/* RouterLink keeps the link colour of the stylesheet; inside the frame text is ink. */
.hg-navitem,
.hg-account {
  color: var(--c-ink);
}

.hg-navitem[aria-current='page'] {
  color: var(--c-accent-text);
}
</style>
