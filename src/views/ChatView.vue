<script setup lang="ts">
// One chat. A new message arrives by signal the moment it is written (see stores/signal.ts).
// The newest page is also fetched now and then, and whenever the signal stream comes back after a
// break: a signal can be lost, the message must not be.

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { Chat, ChatMember, ChatMessage, ChatMessageSignal } from '@/api/types'
import { onSignal, RECONNECTED } from '@/stores/signal'
import UserAvatar from '@/components/UserAvatar.vue'
import { messageTime } from '@/lib/format'
import { auth } from '@/stores/auth'
import { toastError } from '@/stores/toast'

const props = defineProps<{ chatId: number }>()

/** The safety net under the signals, not the delivery: so it is slow. */
const POLL_EVERY_MS = 30000
/** The size of a page the server returns by default. A full page means there may be older ones. */
const PAGE_SIZE = 50

const chat = ref<Chat | null>(null)
const members = ref<ChatMember[]>([])
/** Oldest first, the way they are read. The server sends newest first. */
const messages = ref<ChatMessage[]>([])
const loading = ref<boolean>(true)
const missing = ref<boolean>(false)
const hasOlder = ref<boolean>(false)
const loadingOlder = ref<boolean>(false)

const draft = ref<string>('')
const sending = ref<boolean>(false)

const list = ref<HTMLElement | null>(null)
let timer: number | undefined

const memberNames = computed<string>(() => members.value.map((member) => member.displayName).join(', '))

onMounted(async () => {
  try {
    const [chatList, memberList, page] = await Promise.all([
      api.chats(),
      api.chatMembers(props.chatId),
      api.chatMessages(props.chatId),
    ])
    chat.value = chatList.find((candidate) => candidate.id === props.chatId) ?? null
    members.value = memberList
    messages.value = page.slice().reverse()
    hasOlder.value = page.length === PAGE_SIZE
    await scrollToEnd()

    timer = window.setInterval(poll, POLL_EVERY_MS)
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      missing.value = true
    } else {
      toastError(caught)
    }
  } finally {
    loading.value = false
  }
})

const stopListening: (() => void)[] = [
  onSignal<ChatMessageSignal>('chat.message', (signal) => {
    if (signal.chatId === props.chatId && !loading.value && !missing.value) {
      void addNew([signal.message])
    }
  }),
  onSignal(RECONNECTED, () => void poll()),
]

onBeforeUnmount(() => {
  window.clearInterval(timer)
  stopListening.forEach((stop) => stop())
})

/** Fetches the newest page and adds what is not shown yet. Silent: a failed poll is retried. */
async function poll(): Promise<void> {
  if (document.hidden) {
    return
  }
  try {
    const page: ChatMessage[] = await api.chatMessages(props.chatId)
    await addNew(page)
  } catch (caught) {
    // Removed from the chat meanwhile (declined the invitation in another tab): stop asking.
    if (caught instanceof ApiError && caught.status === 404) {
      window.clearInterval(timer)
      missing.value = true
    }
  }
}

async function addNew(newestFirst: ChatMessage[]): Promise<void> {
  const lastId: number = messages.value[messages.value.length - 1]?.id ?? 0
  const fresh: ChatMessage[] = newestFirst.filter((message) => message.id > lastId).reverse()
  if (fresh.length === 0) {
    return
  }

  // Follow the conversation only if the reader is already at the end of it.
  const atEnd: boolean = isAtEnd()
  messages.value.push(...fresh)
  if (atEnd) {
    await scrollToEnd()
  }
}

async function loadOlder(): Promise<void> {
  const firstId: number | undefined = messages.value[0]?.id
  if (firstId === undefined) {
    return
  }
  loadingOlder.value = true
  try {
    const page: ChatMessage[] = await api.chatMessages(props.chatId, firstId)
    hasOlder.value = page.length === PAGE_SIZE

    // Keep what the reader is looking at in place while older messages appear above it.
    const element: HTMLElement | null = list.value
    const heightBefore: number = element?.scrollHeight ?? 0
    messages.value.unshift(...page.slice().reverse())
    await nextTick()
    if (element !== null) {
      element.scrollTop = element.scrollTop + (element.scrollHeight - heightBefore)
    }
  } catch (caught) {
    toastError(caught)
  } finally {
    loadingOlder.value = false
  }
}

async function send(): Promise<void> {
  const text: string = draft.value.trim()
  if (text === '' || sending.value) {
    return
  }
  sending.value = true
  try {
    const message: ChatMessage = await api.postChatMessage(props.chatId, text)
    draft.value = ''
    await addNew([message])
    await scrollToEnd()
  } catch (caught) {
    toastError(caught)
  } finally {
    sending.value = false
  }
}

/** Enter sends, Shift+Enter makes a new line. */
function onKey(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}

function isAtEnd(): boolean {
  const element: HTMLElement | null = list.value
  if (element === null) {
    return true
  }
  return element.scrollHeight - element.scrollTop - element.clientHeight < 80
}

async function scrollToEnd(): Promise<void> {
  await nextTick()
  const element: HTMLElement | null = list.value
  if (element !== null) {
    element.scrollTop = element.scrollHeight
  }
}

function isMine(message: ChatMessage): boolean {
  return message.authorId === auth.state.userId
}

/** The author's name is shown once per run of their messages, not on every bubble. */
function startsRun(index: number): boolean {
  return index === 0 || messages.value[index - 1]?.authorId !== messages.value[index]?.authorId
}
</script>

<template>
  <main class="chat">
    <header class="chat__head">
      <RouterLink class="chat__back" :to="{ name: 'chats' }" aria-label="All chats">←</RouterLink>
      <div class="grow">
        <h1 class="chat__title">{{ chat?.title ?? 'Chat' }}</h1>
        <p v-if="memberNames !== ''" class="small muted chat__members">{{ memberNames }}</p>
      </div>
    </header>

    <p v-if="loading" class="muted chat__state">Loading…</p>

    <div v-else-if="missing" class="empty chat__state" data-tst-id="chat-missing">
      <p>This chat does not exist, or you are no longer in it.</p>
    </div>

    <template v-else>
      <div ref="list" class="chat__list" data-tst-id="chat-messages">
        <button
          v-if="hasOlder"
          class="btn btn--ghost btn--small chat__older"
          type="button"
          :disabled="loadingOlder"
          @click="loadOlder"
        >
          {{ loadingOlder ? 'Loading…' : 'Earlier messages' }}
        </button>

        <p v-if="messages.length === 0" class="muted chat__hello" data-tst-id="chat-empty">
          Nobody has written yet. Say hi 👋
        </p>

        <div
          v-for="(message, index) in messages"
          :key="message.id"
          class="message"
          :class="{ 'message--mine': isMine(message), 'message--run': startsRun(index) }"
          data-tst-id="chat-message"
        >
          <span class="message__avatar">
            <UserAvatar
              v-if="!isMine(message) && startsRun(index)"
              :name="message.authorName"
              :user-id="message.authorId"
              :size="32"
            />
          </span>

          <div class="message__body">
            <span v-if="!isMine(message) && startsRun(index)" class="message__author">
              {{ message.authorName }}
            </span>
            <div class="message__bubble">
              <span class="message__text">{{ message.text }}</span>
              <time class="message__time" :datetime="message.createdAt">{{ messageTime(message.createdAt) }}</time>
            </div>
          </div>
        </div>
      </div>

      <form class="chat__form" data-tst-id="chat-form" @submit.prevent="send">
        <textarea
          v-model="draft"
          class="input chat__input"
          rows="1"
          maxlength="4000"
          placeholder="Write a message"
          aria-label="Write a message"
          data-tst-id="chat-input"
          @keydown="onKey"
        ></textarea>
        <button
          class="btn"
          type="submit"
          :disabled="sending || draft.trim() === ''"
          data-tst-id="chat-send"
        >
          Send
        </button>
      </form>
    </template>
  </main>
</template>

<style scoped>
/* The chat fills the screen under the top bar (60px + its border): the list scrolls, the form stays. */
.chat {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 880px;
  height: calc(100dvh - 61px);
  margin: 0 auto;
  padding: 0 16px;
}

.chat__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--c-line);
}

.chat__back {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--c-ink);
  font-size: 1.2rem;
}

.chat__back:hover {
  background: var(--c-surface-soft);
}

.chat__title {
  font-size: 1.15rem;
  overflow-wrap: anywhere;
}

.chat__members {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat__state {
  margin-top: 24px;
}

.chat__list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  padding: 16px 0;
  overflow-y: auto;
}

/* A short conversation sits at the bottom, next to the field where the next message is typed. */
.chat__list > :first-child {
  margin-top: auto;
}

.chat__older {
  align-self: center;
  margin-bottom: 8px;
}

.chat__hello {
  margin: auto;
  text-align: center;
}

.message {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 82%;
}

.message--run {
  margin-top: 10px;
}

.message--mine {
  align-self: flex-end;
}

.message__avatar {
  flex: none;
  width: 32px;
  align-self: flex-start;
}

.message--mine .message__avatar {
  display: none;
}

.message__body {
  min-width: 0;
}

.message__author {
  display: block;
  margin: 0 0 2px 12px;
  color: var(--c-ink-soft);
  font-size: 0.78rem;
  font-weight: 700;
}

.message__bubble {
  padding: 8px 14px;
  border: 1px solid var(--c-line);
  border-radius: 18px;
  background: var(--c-surface);
}

.message--mine .message__bubble {
  border-color: transparent;
  background: var(--c-teal);
  color: var(--c-on-teal);
}

.message__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message__time {
  margin-left: 10px;
  opacity: 0.65;
  font-size: 0.72rem;
  white-space: nowrap;
}

.chat__form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 0 16px;
  border-top: 1px solid var(--c-line);
}

.chat__input {
  flex: 1 1 auto;
  min-height: 46px;
  max-height: 140px;
  border-radius: 23px;
  resize: none;
  field-sizing: content;
}
</style>
