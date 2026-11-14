// The one place that talks HTTP. Everything else calls the functions of ./index.ts.

/** Where the server is. In development /api is proxied to it by Vite (see vite.config.ts). */
const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api'

/** A refusal from the server: its body is {"code": "...", "message": "..."}. */
export class ApiError extends Error {
  readonly status: number
  /** Stable and machine-readable, e.g. "email_taken". Empty when the server sent no body. */
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let tokenProvider: () => string | null = () => null
let onUnauthorized: () => void = () => {}

/** Called once at startup by the auth store: how to get the token and what to do when it is refused. */
export function configureHttp(options: { token: () => string | null; unauthorized: () => void }): void {
  tokenProvider = options.token
  onUnauthorized = options.unauthorized
}

export function get<T>(path: string): Promise<T> {
  return send<T>('GET', path)
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return send<T>('POST', path, body)
}

/** Sends one file the way a form does, in a part named "file". */
export function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  return send<T>('POST', path, form)
}

/**
 * The address of something the server serves by a path it gave us (a profile picture), or null if
 * the path is not one of ours.
 *
 * Only paths under /public/ are turned into addresses. Anything else - above all a full URL to
 * another site - is refused: a picture loaded from a foreign address would tell that address who
 * is looking.
 */
export function serverFileUrl(path: string | null | undefined): string | null {
  if (typeof path !== 'string' || !/^\/public\/[A-Za-z0-9/_-]+$/.test(path)) {
    return null
  }
  return BASE_URL + path
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}

  const token: string | null = tokenProvider()
  if (token !== null) {
    headers['Authorization'] = 'Bearer ' + token
  }

  // A form carries its own content type (with the boundary between its parts): the browser sets it.
  const isForm: boolean = body instanceof FormData
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your connection and try again.')
  }

  const text: string = await response.text()
  const json: unknown = text === '' ? undefined : safeParse(text)

  if (response.ok) {
    return json as T
  }

  // A token that was sent and refused is expired or forged: the session is over.
  // (A wrong password on the login form is also 401, but there no token was sent.)
  if (response.status === 401 && token !== null) {
    onUnauthorized()
  }

  const refusal = json as { code?: string; message?: string } | undefined
  throw new ApiError(
    response.status,
    refusal?.code ?? '',
    refusal?.message ?? 'Something went wrong (' + response.status + '). Please try again.',
  )
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
