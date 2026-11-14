// Short messages at the bottom of the screen: "Invitation sent", or what went wrong.

import { reactive } from 'vue'
import { ApiError } from '@/api/http'

export interface Toast {
  id: number
  kind: 'ok' | 'error'
  text: string
}

const SHOWN_FOR_MS = 4000

let nextId = 1

export const toasts: Toast[] = reactive([])

export function toastOk(text: string): void {
  show('ok', text)
}

/** Shows what went wrong. Accepts whatever was caught. */
export function toastError(error: unknown): void {
  show('error', errorText(error))
}

/** The text of a failure for the user, from whatever was caught. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

function show(kind: Toast['kind'], text: string): void {
  const id: number = nextId
  nextId = nextId + 1

  toasts.push({ id, kind, text })

  window.setTimeout(() => {
    const index: number = toasts.findIndex((toast) => toast.id === id)
    if (index >= 0) {
      toasts.splice(index, 1)
    }
  }, SHOWN_FOR_MS)
}
