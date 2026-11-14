<script setup lang="ts">
// One chat: the right pane of views/ChatsView.vue, the whole screen on a phone.
// A new message arrives by signal the moment it is written (see stores/signal.ts).
// The newest page is also fetched now and then, and whenever the signal stream comes back after a
// break: a signal can be lost, the message must not be.
// The messages are shown by day, and inside a day in runs: what one person wrote in a row stands
// under their name once, with the time under the last of it.

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowUp, MessageCircle } from 'lucide-vue-next'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import type { Chat, ChatMember, ChatMessage, ChatMessageSignal } from '@/api/types'
import { onSignal, RECONNECTED } from '@/stores/signal'
import UserAvatar from '@/components/UserAvatar.vue'
import { auth } from '@/stores/auth'
import { toastError } from '@/stores/toast'

const props = defineProps<{ chatId: number }>()

/** The safety net under the signals, not the delivery: so it is slow. */
const POLL_EVERY_MS = 30000
/** The size of a page the server returns by default. A full page means there may be older ones. */
const PAGE_SIZE = 50
/** How many faces the header shows before "+N". */
const FACES = 3

/** What one person wrote in a row, within one day. */
interface Run {
  /** The id of its first message. */
  key: number
  authorId: number
  authorName: string
  mine: boolean
  messages: ChatMessage[]
  /** The moment of its last message. */
  endedAt: string
}

interface Day {
  /** The local date, "2026-10-13". */
  key: string
  label: string
  runs: Run[]
}

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

/** How many messages of others arrived while the reader was looking at older ones. */
const unseen = ref<number>(0)

const list = ref<HTMLElement | null>(null)
let timer: number | undefined

const memberNames = computed<string>(() => members.value.map((member) => member.displayName).join(', '))

/** A message carries the name of its author but not the picture: that comes from the members. */
const avatarUrls = computed<Map<number, string | null>>(
  () => new Map(members.value.map((member) => [member.userId, member.avatarUrl])),
)

// The interface is in English, so dates are too - whatever the language of the browser.
const LOCALE = 'en-GB'
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
const dayYearFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** The messages by day and by run. A new day or another author starts a new run. */
const days = computed<Day[]>(() => {
  const now = new Date()
  const result: Day[] = []
  for (const message of messages.value) {
    const moment = new Date(message.createdAt)
    const key: string = dayKey(moment)
    let day: Day | undefined = result[result.length - 1]
    if (day === undefined || day.key !== key) {
      day = { key, label: dayLabel(moment, now), runs: [] }
      result.push(day)
    }
    let run: Run | undefined = day.runs[day.runs.length - 1]
    if (run === undefined || run.authorId !== message.authorId) {
      run = {
        key: message.id,
        authorId: message.authorId,
        authorName: message.authorName,
        mine: isMine(message),
        messages: [],
        endedAt: message.createdAt,
      }
      day.runs.push(run)
    }
    run.messages.push(message)
    run.endedAt = message.createdAt
  }
  return result
})

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
  // After "loading" is off: the list of messages is in the page only from then on.
  await scrollToEnd()
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

  // Follow the conversation only if the reader is already at the end of it. Otherwise say that
  // there is something new below, and leave them where they are.
  const atEnd: boolean = isAtEnd()
  messages.value.push(...fresh)
  if (atEnd) {
    await scrollToEnd()
  } else {
    unseen.value += fresh.filter((message) => !isMine(message)).length
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
  unseen.value = 0
}

/** The reader came back to the end by themselves: nothing is unseen any more. */
function onScroll(): void {
  if (unseen.value > 0 && isAtEnd()) {
    unseen.value = 0
  }
}

function isMine(message: ChatMessage): boolean {
  return message.authorId === auth.state.userId
}

/** The calendar day of a moment where the reader is, not in UTC. */
function dayKey(moment: Date): string {
  return moment.getFullYear() + '-' + (moment.getMonth() + 1) + '-' + moment.getDate()
}

function dayLabel(moment: Date, now: Date): string {
  if (dayKey(moment) === dayKey(now)) {
    return 'Today'
  }
  // The day before by the calendar, not "24 hours ago": correct across a change of the clocks.
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(moment) === dayKey(yesterday)) {
    return 'Yesterday'
  }
  return moment.getFullYear() === now.getFullYear() ? dayFormat.format(moment) : dayYearFormat.format(moment)
}

/** The day is in the divider above, so a run needs the time only. */
function time(iso: string): string {
  return timeFormat.format(new Date(iso))
}
</script>

<template>
  <div class="chat">
    <header class="chat__head">
      <RouterLink class="hg-iconbtn chat__back" :to="{ name: 'chats' }" aria-label="All chats">
        <ArrowLeft class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
      </RouterLink>
      <div class="app-grow">
        <h2 class="chat__title">{{ chat?.title ?? 'Chat' }}</h2>
        <p v-if="memberNames !== ''" class="chat__members">{{ memberNames }}</p>
      </div>
      <span v-if="members.length > 0" class="hg-stack chat__faces" aria-hidden="true">
        <UserAvatar
          v-for="member in members.slice(0, FACES)"
          :key="member.userId"
          :name="member.displayName"
          :user-id="member.userId"
          :avatar-url="member.avatarUrl"
          :size="32"
        />
        <span v-if="members.length > FACES" class="hg-avatar hg-avatar--32 hg-stack__more">
          +{{ members.length - FACES }}
        </span>
      </span>
    </header>

    <!-- Loading: the shape of a conversation, so the pane does not jump when it arrives. -->
    <div v-if="loading" class="chat__loading" aria-busy="true" aria-label="Loading messages">
      <span class="hg-skel chat__skel chat__skel--wide"></span>
      <span class="hg-skel chat__skel"></span>
      <span class="hg-skel chat__skel chat__skel--own"></span>
      <span class="hg-skel chat__skel chat__skel--wide"></span>
    </div>

    <div v-else-if="missing" class="chat__state">
      <div class="hg-empty" data-tst-id="chat-missing">
        <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
        <h3 class="hg-empty__title">No such chat</h3>
        <p class="hg-empty__text">This chat does not exist, or you are no longer in it.</p>
      </div>
    </div>

    <template v-else>
      <div class="chat__body">
        <div
          ref="list"
          class="hg-chat chat__list"
          role="log"
          aria-label="Messages"
          data-tst-id="chat-messages"
          @scroll.passive="onScroll"
        >
          <div v-if="hasOlder" class="chat__older">
            <button
              class="hg-btn hg-btn--quiet hg-btn--sm"
              :class="{ 'is-loading': loadingOlder }"
              type="button"
              :disabled="loadingOlder"
              @click="loadOlder"
            >
              <span>Earlier messages</span>
            </button>
          </div>

          <div v-if="messages.length === 0" class="hg-empty chat__hello" data-tst-id="chat-empty">
            <MessageCircle class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
            <h3 class="hg-empty__title">Nobody has written yet</h3>
            <p class="hg-empty__text">Say hi.</p>
          </div>

          <template v-for="day in days" :key="day.key">
            <span class="hg-daydiv">{{ day.label }}</span>

            <div v-for="run in day.runs" :key="run.key" class="hg-run" :class="{ 'hg-run--own': run.mine }">
              <UserAvatar
                v-if="!run.mine"
                :name="run.authorName"
                :user-id="run.authorId"
                :avatar-url="avatarUrls.get(run.authorId)"
                :size="32"
              />
              <div class="hg-run__body">
                <p v-if="!run.mine" class="hg-run__name">{{ run.authorName }}</p>
                <!-- On one line: the bubble keeps the line breaks of the text, and would keep
                     the ones of this template too. -->
                <p
                  v-for="(message, index) in run.messages"
                  :key="message.id"
                  class="hg-bubble chat__bubble"
                  :class="{ 'hg-bubble--own': run.mine, 'hg-bubble--first': index === 0 }"
                  data-tst-id="chat-message"
                >{{ message.text }}</p>
                <time class="hg-run__time" :datetime="run.endedAt">{{ time(run.endedAt) }}</time>
              </div>
            </div>
          </template>
        </div>

        <button v-if="unseen > 0" class="hg-newpill chat__new" type="button" @click="scrollToEnd">
          <ArrowDown class="hg-icon chat__new-icon" :stroke-width="1.5" aria-hidden="true" />
          New messages
        </button>
      </div>

      <form class="chat__form" data-tst-id="chat-form" @submit.prevent="send">
        <div class="hg-composer">
          <textarea
            v-model="draft"
            class="hg-textarea chat__input"
            rows="1"
            maxlength="4000"
            placeholder="Write a message"
            aria-label="Write a message"
            data-tst-id="chat-input"
            @keydown="onKey"
          ></textarea>
          <button
            class="hg-iconbtn hg-iconbtn--primary"
            type="submit"
            :disabled="sending || draft.trim() === ''"
            aria-label="Send message"
            title="Send message"
            data-tst-id="chat-send"
          >
            <ArrowUp class="hg-icon" :stroke-width="1.5" aria-hidden="true" />
          </button>
        </div>
        <p class="chat__hint">Enter sends. Shift+Enter makes a new line.</p>
      </form>
    </template>
  </div>
</template>

<style scoped>
/* Fills the pane ChatsView gives it (that one computes the height of the screen): the head and
   the form keep their place, the messages scroll between them. */
.chat {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.chat__head {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--c-line);
}

/* The way back to the list: only where the list is not on the screen (a phone). */
.chat__back {
  display: none;
}

.chat__title {
  overflow: hidden;
  font: var(--t-title-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat__members {
  overflow: hidden;
  color: var(--c-ink-soft);
  font: var(--t-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat__state {
  display: grid;
  flex: 1;
  place-items: center;
}

.chat__loading {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
}

.chat__skel {
  width: 30%;
  height: var(--size-control);
  border-radius: var(--r-l);
}

.chat__skel--wide {
  width: 55%;
}

.chat__skel--own {
  align-self: flex-end;
}

/* Holds the scrolling list and, over its bottom edge, the "New messages" pill. */
.chat__body {
  position: relative;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
}

.chat__list {
  flex: 1 1 0;
  min-height: 0;
  padding: var(--s-4) var(--s-5);
  overflow-y: auto;
}

/* A short conversation sits at the bottom, next to the field where the next message is typed.
   (Not "justify-content: flex-end": that would put the top of a long one out of reach.) */
.chat__list > :first-child {
  margin-top: auto;
}

.chat__older {
  display: flex;
  flex: none;
  justify-content: center;
}

.chat__hello {
  margin-bottom: auto;
}

/* A message keeps the line breaks it was written with (Shift+Enter). */
.chat__bubble {
  white-space: pre-wrap;
}

.chat__new {
  position: absolute;
  bottom: var(--s-3);
  left: 50%;
  transform: translateX(-50%);
}

.chat__new-icon {
  width: var(--s-4);
  height: var(--s-4);
}

.chat__form {
  flex: none;
  padding: var(--s-3) var(--s-5) var(--s-4);
  border-top: 1px solid var(--c-line);
}

/* Grows with the text up to a few lines, where the browser can; two classes, to win over
   ".hg-composer .hg-textarea" which fixes the height. */
.chat__form .chat__input {
  flex: 1 1 auto;
  height: auto;
  max-height: calc(var(--s-8) * 2);
  field-sizing: content;
}

.chat__hint {
  margin-top: var(--s-2);
  color: var(--c-ink-soft);
  font: var(--t-caption);
}

@media (max-width: 767px) {
  .chat__head {
    gap: var(--s-2);
    padding: var(--s-2) var(--s-4) var(--s-2) var(--s-2);
  }

  .chat__back {
    display: inline-grid;
  }

  /* The names under the title say who is here; the faces would squeeze the title. */
  .chat__faces {
    display: none;
  }

  .chat__list,
  .chat__loading {
    padding: var(--s-3) var(--s-4);
  }

  .chat__form {
    padding: var(--s-2) var(--s-4) calc(var(--s-2) + env(safe-area-inset-bottom));
  }

  /* No Shift key on a phone's keyboard, and the room is better spent on messages. */
  .chat__hint {
    display: none;
  }
}
</style>
