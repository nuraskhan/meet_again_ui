// The chats of the logged-in person, for the list of chats and for the number beside "Chats" in
// the navigation: each chat with its newest message and how many messages are new.
//
// The server orders the list by the newest message and counts the unread ones; this store keeps
// that picture current between loads. A message arriving by signal moves its chat to the top and
// adds to its count - unless that chat is the one open on the screen, which is then told to the
// server as read. After a break in the connection the list is read again.

import { computed, reactive, watch } from 'vue'
import { api } from '@/api'
import type { Chat, ChatMessage, ChatMessageSignal } from '@/api/types'
import { auth } from '@/stores/auth'
import { onSignal, RECONNECTED } from '@/stores/signal'

interface ChatsState {
  /** The one written in most recently first. */
  items: Chat[]
  /** False until the first load ends. */
  loaded: boolean
  /** The chat open on the screen now; null when none is. */
  openId: number | null
}

const state: ChatsState = reactive({ items: [], loaded: false, openId: null })

export const chats = {
  state,

  /** How many messages are new across all chats: the number in the navigation. */
  totalUnread: computed<number>(() => state.items.reduce((sum, chat) => sum + chat.unreadCount, 0)),

  async load(): Promise<void> {
    try {
      state.items = await api.chats()
    } finally {
      state.loaded = true
    }
    // WHY: on a fresh page the list and the open chat load at the same time. If the chat won the
    // race, it was marked read before there was a row to clear - and this list, asked a moment
    // earlier, still counts its messages as new. The chat on the screen is read by definition.
    const open: Chat | undefined = state.items.find((candidate) => candidate.id === state.openId)
    if (open !== undefined && open.unreadCount > 0 && !document.hidden) {
      void markRead(open.id)
    }
  },

  /** A chat page opened (or closed, with null). An open chat is read: its count goes to zero. */
  setOpen(chatId: number | null): void {
    state.openId = chatId
    if (chatId !== null) {
      void markRead(chatId)
    }
  },

  /** The person wrote a message themselves: it is the newest of its chat now. */
  noteOwnMessage(chatId: number, message: ChatMessage): void {
    place(chatId, message, false)
  },
}

/** Tells the server the chat is read up to its newest message. Silent: the next load corrects. */
async function markRead(chatId: number): Promise<void> {
  const chat: Chat | undefined = state.items.find((candidate) => candidate.id === chatId)
  if (chat !== undefined) {
    chat.unreadCount = 0
  }
  try {
    await api.markChatRead(chatId)
  } catch {
    // Not a member any more, or no connection: nothing to do here.
  }
}

/** Puts a new message into its chat and moves the chat to the top. */
function place(chatId: number, message: ChatMessage, countsAsUnread: boolean): void {
  const index: number = state.items.findIndex((candidate) => candidate.id === chatId)
  if (index < 0) {
    // A chat that is not in the list yet (the person was just let into a plan): read the list.
    void chats.load().catch(() => {})
    return
  }
  const chat: Chat = state.items[index]!
  // A signal and the answer to one's own request may both bring the same message.
  if (chat.lastMessage !== null && chat.lastMessage.id >= message.id) {
    return
  }
  chat.lastMessage = message
  if (countsAsUnread) {
    chat.unreadCount = chat.unreadCount + 1
  }
  state.items.splice(index, 1)
  state.items.unshift(chat)
}

onSignal<ChatMessageSignal>('chat.message', (signal) => {
  // Looking at that very chat right now: the message is seen, not new.
  const seenNow: boolean = signal.chatId === state.openId && !document.hidden
  place(signal.chatId, signal.message, !seenNow)
  if (seenNow) {
    void markRead(signal.chatId)
  }
})

// Being let into a plan, or removed from one, changes which chats there are.
onSignal('notification', () => void chats.load().catch(() => {}))

onSignal(RECONNECTED, () => void chats.load().catch(() => {}))

// Coming back to the tab with a chat open: what arrived meanwhile is seen now.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.openId !== null) {
    void markRead(state.openId)
  }
})

// Another person logging in on this browser must not see the previous one's chats.
watch(
  () => auth.state.token,
  (token) => {
    state.items = []
    state.loaded = false
    state.openId = null
    if (token !== null) {
      void chats.load().catch(() => {})
    }
  },
  { immediate: true },
)
