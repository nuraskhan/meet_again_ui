<script setup lang="ts">
// The chats the user is in. Every chat belongs to a plan and is named after it.
//
// This is also the layout of the chat pages: the list at the left and the open chat (the nested
// route "chat", views/ChatView.vue) at the right. On a phone there is room for one of them only:
// the list on "chats", the chat on "chat". The list stays loaded while moving between chats.

import { computed, onMounted, ref, watch } from 'vue'
import { MessageCircle } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import type { Chat } from '@/api/types'
import EventTypeIcon from '@/components/EventTypeIcon.vue'
import { toastError } from '@/stores/toast'

const route = useRoute()

const chats = ref<Chat[]>([])
const loading = ref<boolean>(true)

/** The chat open at the right; null on the list alone. */
const openChatId = computed<number | null>(() => (route.name === 'chat' ? Number(route.params.chatId) : null))

// The interface is in English, so dates are too - whatever the language of the browser.
const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

onMounted(load)

// A chat that is not in the list was opened (it appeared after the list was loaded): read the
// list again, so the open chat has its row.
watch(openChatId, (chatId) => {
  if (chatId !== null && !loading.value && !chats.value.some((chat) => chat.id === chatId)) {
    void load()
  }
})

async function load(): Promise<void> {
  try {
    chats.value = await api.chats()
  } catch (caught) {
    toastError(caught)
  } finally {
    loading.value = false
  }
}

/** "Tue, 17 Nov". */
function day(iso: string): string {
  return dayFormat.format(new Date(iso))
}
</script>

<template>
  <div class="chats" :class="{ 'chats--open': openChatId !== null }">
    <div class="chats__list-pane">
      <h1 class="chats__title">Chats</h1>

      <!-- Loading: the shape of the list, so the pane does not jump when it arrives. -->
      <ul v-if="loading" class="hg-list" aria-busy="true" aria-label="Loading chats">
        <li v-for="n in 4" :key="n" class="hg-row hg-row--72">
          <span class="hg-skel hg-skel--circle chats__skel-icon"></span>
          <span class="hg-row__text chats__text chats__skel-text">
            <span class="hg-skel hg-skel--line chats__skel-name"></span>
            <span class="hg-skel hg-skel--line chats__skel-sub"></span>
          </span>
        </li>
      </ul>

      <ul v-else-if="chats.length > 0" class="hg-list">
        <li v-for="chat in chats" :key="chat.id">
          <RouterLink
            class="hg-row hg-row--72 hg-row--link chats__row"
            :class="{ 'hg-row--new': chat.id === openChatId }"
            :to="{ name: 'chat', params: { chatId: chat.id } }"
            data-tst-id="chat-row"
          >
            <span class="hg-iconcircle">
              <EventTypeIcon v-if="chat.eventType !== null" :type="chat.eventType" />
              <MessageCircle v-else class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            </span>
            <span class="hg-row__text chats__text">
              <span class="hg-row__title">{{ chat.title }}</span>
              <span class="hg-row__sub">
                {{ chat.memberCount }} {{ chat.memberCount === 1 ? 'member' : 'members' }} · started
                {{ day(chat.createdAt) }}
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>

      <div v-else class="hg-empty" data-tst-id="chats-empty">
        <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <h2 class="hg-empty__title">No chats yet</h2>
        <p class="hg-empty__text">A chat appears by itself when you send or receive an invitation.</p>
        <RouterLink class="hg-btn hg-btn--primary chats__invite" :to="{ name: 'plan-new' }">
          Invite friends
        </RouterLink>
      </div>
    </div>

    <section class="chats__chat-pane">
      <RouterView v-slot="{ Component: openChat }">
        <!-- The key: another chat is another conversation, loaded from the start - not the same
             component with a changed number. -->
        <component :is="openChat" v-if="openChat" :key="openChatId ?? 0" />

        <div v-else class="chats__none">
          <div class="hg-empty">
            <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <h2 class="hg-empty__title">Choose a chat</h2>
            <p class="hg-empty__text">Pick a chat from the list to read it and to write.</p>
          </div>
        </div>
      </RouterView>
    </section>
  </div>
</template>

<style scoped>
/*
 * The two panes fill the screen exactly: nothing scrolls but the list of chats and the messages.
 *
 * The frame (views/AppShell.vue, ".app-main" in assets/main.css) gives every page a padding, and
 * the panes go edge to edge, so the padding is cancelled with negative margins of the same size:
 *   768 and wider: padding 32px 24px 64px  = --s-6 --s-5 --s-8, nothing above the page,
 *                  so the height is the whole 100dvh;
 *   below 768:     padding 16px 16px (tab bar + 32px + safe area) = --s-4, --s-4,
 *                  --size-tab-bar + --s-6 + env(safe-area-inset-bottom), and the top bar of the
 *                  frame (56px, sticky, in the flow) stands above the page.
 */
.chats {
  /* The height of the frame's top bar on a phone (".hg-topbar": 56px); it has no token of its own. */
  --chats-top-bar: 56px;

  display: flex;
  height: 100vh;
  height: 100dvh;
  margin: calc(var(--s-6) * -1) calc(var(--s-5) * -1) calc(var(--s-8) * -1);
}

.chats__list-pane {
  flex: none;
  /* Narrower than the design's 360px when the screen is: the chat needs the room more. */
  width: min(var(--size-list-pane), 40%);
  padding: var(--s-6) var(--s-2);
  overflow-y: auto;
  border-right: 1px solid var(--c-line);
}

.chats__title {
  margin: 0 0 var(--s-4) var(--s-4);
  font: var(--t-title-1);
  letter-spacing: -0.015em;
}

/* A row is a link, but reads as text: the stylesheet colours every link. */
.chats__row,
.chats__row:hover {
  border-radius: var(--r-m);
  color: var(--c-ink);
}

/* Rows here are separate rounded pieces, so no line between them. */
.chats__text {
  border-bottom: 0;
}

/* A link that is a button: "a:hover" of the stylesheet would paint its label in the accent
   colour, on the accent background. */
.chats__invite:hover {
  color: var(--c-on-accent);
}

.chats__chat-pane {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.chats__none {
  display: grid;
  flex: 1;
  place-items: center;
}

.chats__skel-icon {
  flex: none;
  width: var(--size-control);
  height: var(--size-control);
}

.chats__skel-text {
  gap: var(--s-2);
}

.chats__skel-name {
  width: 60%;
}

.chats__skel-sub {
  width: 40%;
}

@media (max-width: 767px) {
  /* One pane at a time. The list is an ordinary page that scrolls with the screen, above the
     tab bar: only the side padding of the frame is cancelled, the rows have their own. */
  .chats {
    display: block;
    height: auto;
    margin: 0 calc(var(--s-4) * -1);
  }

  .chats__list-pane {
    width: auto;
    padding: 0 var(--s-2);
    overflow-y: visible;
    border-right: 0;
  }

  .chats__chat-pane {
    display: none;
  }

  /* The open chat takes the whole screen under the top bar. The tab bar is not shown inside a
     chat (see AppShell), but the frame's bottom padding for it is still there: cancelled too. */
  .chats--open {
    display: flex;
    height: calc(100vh - var(--chats-top-bar));
    height: calc(100dvh - var(--chats-top-bar));
    margin: calc(var(--s-4) * -1) calc(var(--s-4) * -1)
      calc((var(--size-tab-bar) + var(--s-6) + env(safe-area-inset-bottom)) * -1);
  }

  .chats--open .chats__list-pane {
    display: none;
  }

  .chats--open .chats__chat-pane {
    display: flex;
  }
}
</style>
