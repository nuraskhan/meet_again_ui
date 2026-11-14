// Who is logged in. One reactive object for the whole application; the token survives a reload in
// localStorage.

import { computed, reactive } from 'vue'
import { api } from '@/api'
import { configureHttp } from '@/api/http'
import type { AuthResponse, MyProfile } from '@/api/types'

const TOKEN_KEY = 'meet_again.token'
const USER_ID_KEY = 'meet_again.userId'

interface AuthState {
  token: string | null
  userId: number | null
  /** Loaded after login and on reload; null until then. */
  profile: MyProfile | null
}

const state: AuthState = reactive({
  token: readStorage(TOKEN_KEY),
  userId: toNumber(readStorage(USER_ID_KEY)),
  profile: null,
})

/** Set by main.ts: where to send the user when the session ends. */
let afterLogout: () => void = () => {}

export function onLogout(handler: () => void): void {
  afterLogout = handler
}

configureHttp({
  token: () => state.token,
  // The server refused our token: forget it and go to the login page.
  unauthorized: () => logout(),
})

export const auth = {
  state,
  isLoggedIn: computed<boolean>(() => state.token !== null),

  async login(email: string, password: string): Promise<void> {
    accept(await api.login(email, password))
    await loadProfile()
  },

  async register(email: string, password: string, displayName: string): Promise<void> {
    accept(await api.register(email, password, displayName))
    await loadProfile()
  },

  loadProfile,
  logout,
}

function accept(response: AuthResponse): void {
  state.token = response.token
  state.userId = response.userId
  writeStorage(TOKEN_KEY, response.token)
  writeStorage(USER_ID_KEY, String(response.userId))
}

async function loadProfile(): Promise<void> {
  if (state.token === null) {
    return
  }
  state.profile = await api.myProfile()
}

function logout(): void {
  state.token = null
  state.userId = null
  state.profile = null
  writeStorage(TOKEN_KEY, null)
  writeStorage(USER_ID_KEY, null)
  afterLogout()
}

// localStorage can be unavailable (private mode, blocked site data): the app then simply does not
// remember the session across reloads.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // nothing to do
  }
}

function toNumber(value: string | null): number | null {
  if (value === null) {
    return null
  }
  const parsed: number = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
