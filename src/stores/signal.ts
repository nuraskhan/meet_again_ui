// Signals from the server: one request that stays open while somebody is logged in, into which the
// server writes whenever there is something for them - a new notification, a chat message.
//
// A signal is a hint, never the record. Whatever it speaks of is in the database, and every page
// still loads its own data; a signal only lets it show a change at once instead of on the next
// visit. So a lost signal loses nothing - and after a break in the connection the listeners get
// RECONNECTED and read again whatever they may have missed.

import { reactive, watch } from 'vue'
import { ApiError, openStream } from '@/api/http'
import { auth } from '@/stores/auth'

/** Sent by this file itself, not by the server: the stream is open again after a break. */
export const RECONNECTED = 'reconnected'

type Handler = (data: unknown) => void

const handlers: Map<string, Set<Handler>> = new Map()

export const signalState: { connected: boolean } = reactive({ connected: false })

/**
 * Listens for one type of signal.
 *
 * @returns a function that stops listening; a page calls it when it is left
 */
export function onSignal<T>(type: string, handler: (data: T) => void): () => void {
  const set: Set<Handler> = handlers.get(type) ?? new Set()
  handlers.set(type, set)
  set.add(handler as Handler)
  return () => {
    set.delete(handler as Handler)
  }
}

function dispatch(type: string, data: unknown): void {
  for (const handler of handlers.get(type) ?? []) {
    try {
      handler(data)
    } catch (error) {
      // One listener failing must not stop the stream for the others.
      console.error('signal handler failed', type, error)
    }
  }
}

// Reconnecting: at once after the server ended the stream on its own (it renews streams now and
// then), slower and slower while the server cannot be reached.
const RETRY_FIRST_MS = 1000
const RETRY_MAX_MS = 30000

/** The stream that is open now; null when nobody is logged in. */
let current: AbortController | null = null

async function run(abort: AbortController): Promise<void> {
  let retryIn: number = RETRY_FIRST_MS
  let everConnected = false

  while (!abort.signal.aborted) {
    try {
      const body: ReadableStream<Uint8Array> = await openStream('/signal/stream', abort.signal)

      await read(body, (type, data) => {
        if (type === 'hello') {
          signalState.connected = true
          retryIn = RETRY_FIRST_MS
          if (everConnected) {
            dispatch(RECONNECTED, null)
          }
          everConnected = true
        } else {
          dispatch(type, data)
        }
      })
    } catch (error) {
      // The token was refused: the http layer has logged out, and that stops this loop.
      if (error instanceof ApiError && error.status === 401) {
        return
      }
    }

    signalState.connected = false
    if (abort.signal.aborted) {
      return
    }
    await sleep(retryIn, abort.signal)
    retryIn = Math.min(retryIn * 2, RETRY_MAX_MS)
  }
}

/**
 * Reads the stream to its end, calling {@code onEvent} for every event in it.
 *
 * The format (Server-Sent Events) is lines: "event: <type>", "data: <json>", and an empty line
 * that ends the event. A line starting with a colon is a keep-alive and means nothing.
 */
async function read(
  body: ReadableStream<Uint8Array>,
  onEvent: (type: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let type = ''
  let data = ''

  for (;;) {
    const chunk = await reader.read()
    if (chunk.done) {
      return
    }
    buffer += decoder.decode(chunk.value, { stream: true })

    // The last piece may be half a line: it waits for the next chunk.
    const lines: string[] = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line === '') {
        if (type !== '') {
          onEvent(type, parse(data))
        }
        type = ''
        data = ''
      } else if (line.startsWith('event:')) {
        type = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim()
      }
    }
  }
}

function parse(text: string): unknown {
  try {
    return text === '' ? null : JSON.parse(text)
  } catch {
    return null
  }
}

function sleep(ms: number, abort: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer: number = window.setTimeout(resolve, ms)
    abort.addEventListener('abort', () => {
      window.clearTimeout(timer)
      resolve()
    })
  })
}

// The stream follows the session: opened at login (or on a reload with a remembered token),
// closed at logout, reopened for whoever logs in next.
watch(
  () => auth.state.token,
  (token) => {
    current?.abort()
    current = null
    signalState.connected = false

    if (token !== null) {
      current = new AbortController()
      void run(current)
    }
  },
  { immediate: true },
)
