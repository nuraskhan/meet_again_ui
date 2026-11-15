<script setup lang="ts">
// The frame of every page for a logged-in user. Three forms of one thing, chosen by the width of
// the screen (the rules are in assets/main.css, "the frame"):
//   wide    - a sidebar with the logo, "New plan", the navigation and the account;
//   medium  - the same sidebar collapsed to icons;
//   phone   - a bar at the top (logo, bell, account) and a tab bar at the bottom.

import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { BarChart3, Bell, CalendarDays, Compass, ListChecks, MessageCircle, PanelLeftClose, PanelLeftOpen, Plus, Sparkles, Users } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import HangeloLogo from '@/components/HangeloLogo.vue'
import PlusDialog from '@/components/PlusDialog.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import VerifyEmailBanner from '@/components/VerifyEmailBanner.vue'
import { auth } from '@/stores/auth'
import { chats } from '@/stores/chats'
import { notifications } from '@/stores/notifications'

const route = useRoute()

// Hangelo Plus. Someone on the free plan is offered the upgrade beside their name; someone on
// Plus carries the badge there instead. (Nothing is limited on the free plan: Plus only adds.)
const plusOpen = ref<boolean>(false)
const onFreePlan = computed<boolean>(() => auth.state.profile?.privilege === 'STANDARD')
const onPlus = computed<boolean>(() => auth.state.profile?.privilege === 'PLUS')

// The analytics are for the administrators of the site: the link is shown only to them. The
// server decides who that is, and is asked whenever somebody signs in.
const isAdmin = ref<boolean>(false)

watch(
  () => auth.state.token,
  async (token) => {
    isAdmin.value = false
    if (token === null) {
      return
    }
    try {
      isAdmin.value = (await api.adminAccess()).admin
    } catch {
      // Not knowing means no link; the page itself still answers for those who may see it.
    }
  },
  { immediate: true },
)

// The sidebar can be folded to its icons, to give the page the room. The choice is kept in this
// browser. (On a medium screen it is always folded, and on a phone there is no sidebar: there the
// button is not shown.)
const FOLDED_KEY = 'hangelo.sidebarFolded'
const folded = ref<boolean>(readFolded())

function toggleFolded(): void {
  folded.value = !folded.value
  try {
    localStorage.setItem(FOLDED_KEY, folded.value ? '1' : '0')
  } catch {
    // Storage is unavailable (private mode): the choice lasts until the page is reloaded.
  }
}

function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLDED_KEY) === '1'
  } catch {
    return false
  }
}

const NAV: { name: string; label: string; icon: Component }[] = [
  { name: 'feed', label: 'Feed', icon: Compass },
  // Plans are a list; the calendar picture belongs to the calendar alone - folded to icons, two
  // calendars one under the other could not be told apart.
  { name: 'plans', label: 'Plans', icon: ListChecks },
  { name: 'calendar', label: 'Calendar', icon: CalendarDays },
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
  <div class="app-shell" :class="{ 'app-shell--folded': folded }">
    <!-- Wide and medium screens -->
    <aside class="hg-sidebar app-shell__side">
      <div class="shell__top">
        <RouterLink class="shell__logo" :to="{ name: 'plans' }" aria-label="Hangelo, my plans">
          <HangeloLogo />
        </RouterLink>
        <button
          class="hg-iconbtn shell__fold"
          type="button"
          :aria-label="folded ? 'Show the sidebar' : 'Hide the sidebar'"
          :title="folded ? 'Show the sidebar' : 'Hide the sidebar'"
          :aria-expanded="!folded"
          data-tst-id="sidebar-fold"
          @click="toggleFolded"
        >
          <PanelLeftOpen v-if="folded" class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <PanelLeftClose v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        </button>
      </div>

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
          <!-- New messages across all chats. -->
          <span
            v-if="item.name === 'chats' && chats.totalUnread.value > 0"
            class="hg-count"
            :aria-label="chats.totalUnread.value + ' new messages'"
            data-tst-id="nav-chats-unread"
          >
            {{ chats.totalUnread.value > 99 ? '99+' : chats.totalUnread.value }}
          </span>
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

      <RouterLink
        v-if="isAdmin"
        class="hg-navitem shell__admin"
        :to="{ name: 'analytics' }"
        :aria-current="isCurrent('analytics') ? 'page' : undefined"
        title="Analytics"
        data-tst-id="nav-analytics"
      >
        <BarChart3 class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span class="hg-navitem__label app-wide-only">Analytics</span>
      </RouterLink>

      <!-- Wide screens have no top bar: the switch sits at the foot of the sidebar. -->
      <span class="shell__theme"><ThemeToggle /></span>

      <!-- The account's menu: the way to Plus stands right above the name. -->
      <button
        v-if="onFreePlan"
        class="hg-btn hg-btn--outline hg-btn--block shell__upgrade"
        type="button"
        title="Upgrade to Plus"
        data-tst-id="plus-upgrade"
        @click="plusOpen = true"
      >
        <Sparkles class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <span class="app-wide-only">Upgrade to Plus</span>
      </button>

      <RouterLink class="hg-account" :to="{ name: 'profile' }" title="My profile" data-tst-id="nav-profile">
        <UserAvatar
          :name="auth.state.profile?.displayName ?? '?'"
          :avatar-url="auth.state.profile?.avatarUrl"
          :size="32"
        />
        <span class="shell__account app-wide-only">
          <b class="shell__name">
            {{ auth.state.profile?.displayName ?? '' }}
            <span v-if="onPlus" class="hg-badge shell__plus" data-tst-id="plus-badge">Plus</span>
          </b>
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

      <span v-if="onPlus" class="hg-badge shell__plus" data-tst-id="plus-badge-phone">Plus</span>
      <button
        v-else-if="onFreePlan"
        class="hg-iconbtn"
        type="button"
        aria-label="Upgrade to Plus"
        data-tst-id="plus-upgrade-phone"
        @click="plusOpen = true"
      >
        <Sparkles class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      </button>

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
        <ListChecks class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
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
        <span class="shell__tab-icon">
          <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          <span v-if="chats.totalUnread.value > 0" class="hg-count shell__tab-count" aria-hidden="true">
            {{ chats.totalUnread.value > 99 ? '99+' : chats.totalUnread.value }}
          </span>
        </span>
        <span>Chats</span>
      </RouterLink>
    </nav>

    <Teleport to="body">
      <PlusDialog v-if="plusOpen" @close="plusOpen = false" />
    </Teleport>
  </div>
</template>

<style scoped>
.shell__logo {
  display: inline-flex;
  padding: 0 var(--s-2);
  color: var(--c-ink);
}

/* The logo and, beside it, the button that folds the sidebar. Folded: one under the other. */
.shell__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
}

.app-shell--folded .shell__top {
  flex-direction: column;
}

/* On a medium screen the sidebar is folded always: there is nothing for the button to do. */
@media (max-width: 1279px) {
  .shell__top {
    flex-direction: column;
  }

  .shell__fold {
    display: none;
  }
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

/* The count of new messages on the Chats tab of a phone: on the corner of its icon. */
.shell__tab-icon {
  position: relative;
  display: inline-flex;
}

.shell__tab-count {
  position: absolute;
  top: -6px;
  left: 12px;
  box-shadow: 0 0 0 2px var(--c-page);
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

/* The badge of the Plus plan: the accent on its soft tint - the one place a plan is shown. */
.shell__plus {
  background: var(--c-accent-soft);
  color: var(--c-accent-text);
  font-weight: 700;
  vertical-align: middle;
}

/* The upgrade button takes the place right above the account. */
.shell__upgrade + .hg-account {
  margin-top: 0;
}
</style>
