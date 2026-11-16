// Who is logged in. One reactive object for the whole application; the token survives a reload in
// localStorage.
//
// There are three states, not two:
//   - nobody:   no token;
//   - pending:  registered or logged in, but the e-mail is not confirmed. The server refuses
//               everything such a token asks for, except finishing the confirmation - so the
//               application is closed, and the token is kept apart, as "pending";
//   - logged in: the token of a confirmed account.
//
// WHY the pending token is kept apart and not in `token`: everything that starts by itself when
// someone is logged in (the stream of signals, the bell, the chats) watches `token`. With an
// unconfirmed account all of it would start, be refused, and try again.
//
// A pending token lives in memory only, never in localStorage: an account that is not confirmed
// is not remembered. Close the tab or reload, and the way back is the login page - which sends a
// fresh code and asks for it.

import { computed, reactive } from 'vue'
import { api } from '@/api'
import { configureHttp } from '@/api/http'
import type { AuthResponse, MyProfile } from '@/api/types'

const TOKEN_KEY = 'hangelo.token'
/** Where an earlier version kept the pending token. Nothing is written there now; it is cleared. */
const OLD_PENDING_TOKEN_KEY = 'hangelo.pendingToken'
const USER_ID_KEY = 'hangelo.userId'

interface AuthState {
  token: string | null
  /** The token of an account whose e-mail is not confirmed yet. Never set together with `token`. */
  pendingToken: string | null
  userId: number | null
  /** Loaded after login and on reload; null until then. */
  profile: MyProfile | null
}

const state: AuthState = reactive({
  token: readStorage(TOKEN_KEY),
  pendingToken: null,
  userId: toNumber(readStorage(USER_ID_KEY)),
  profile: null,
})

/** Set by main.ts: where to send the user when the session ends. */
let afterLogout: () => void = () => {}

export function onLogout(handler: () => void): void {
  afterLogout = handler
}

writeStorage(OLD_PENDING_TOKEN_KEY, null)

configureHttp({
  token: () => state.token ?? state.pendingToken,
  // The server refused our token: forget it and go to the login page.
  unauthorized: () => logout(),
  // The server says "confirm your e-mail first" to a request made with a REMEMBERED token: a
  // session from before confirming became required. It can do nothing; it is ended, and the login
  // page leads to the code. (A pending token gets the same answer on purpose - it is waiting for
  // the code on its own page - and is left alone.)
  unconfirmed: () => {
    if (state.token !== null) {
      logout()
    }
  },
})

export const auth = {
  state,

  isLoggedIn: computed<boolean>(() => state.token !== null),

  /** Has an account, has not confirmed the e-mail: the application is closed to them. */
  isPending: computed<boolean>(() => state.token === null && state.pendingToken !== null),

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
  state.userId = response.userId
  writeStorage(USER_ID_KEY, String(response.userId))
  hold(response.token, response.emailVerified)
}

/** Keeps the token as the one of a confirmed account, or as a pending one. */
function hold(token: string, confirmed: boolean): void {
  state.token = confirmed ? token : null
  state.pendingToken = confirmed ? null : token
  writeStorage(TOKEN_KEY, state.token)
}

/**
 * Loads the profile of whoever holds the token, pending or not. What it says about the e-mail
 * decides what the token is worth:
 *   - a pending token of an account that is confirmed now (the code was typed, or the link from
 *     the letter opened somewhere) becomes a real one: the person is in;
 *   - a remembered token of an account that is NOT confirmed (an account from before confirming
 *     became required) is dropped: back to the login page, which leads to the code.
 */
async function loadProfile(): Promise<void> {
  const token: string | null = state.token ?? state.pendingToken
  if (token === null) {
    return
  }
  const profile: MyProfile = await api.myProfile()
  // Logged out, or in as someone else, while the answer was on its way: it is not ours any more.
  if ((state.token ?? state.pendingToken) !== token) {
    return
  }
  if (!profile.emailVerified && state.token !== null) {
    logout()
    return
  }
  state.profile = profile
  hold(token, profile.emailVerified)
}

function logout(): void {
  state.token = null
  state.pendingToken = null
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
