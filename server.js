// The production server of the UI (Heroku runs it: see Procfile). No dependencies, only Node.
//
// The application lives at the root of its own address, hangelo.brainb.kz (the same as "base" in
// vite.config.ts).
//
// It does the two things the Vite dev server does in development:
//   1. serves the built application from dist/, answering any unknown path with index.html, so a
//      reload on /plans/7 works;
//   2. forwards /api/* to the backend, so the browser talks to one origin and the backend needs no
//      CORS setup.
//
// Environment:
//   PORT     where to listen (Heroku sets it); 19000 by default, as in development
//   API_URL  the backend, e.g. https://my-backend.herokuapp.com; http://localhost:29000 by default

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT ?? 19000)
const API_URL = new URL(process.env.API_URL ?? 'http://localhost:29000')
/**
 * The path the application was served under for one release (v0.2.0). Addresses with it are still
 * around - in letters already sent, in bookmarks - and are led to the same place without it.
 */
const OLD_BASE = '/hangelo'
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const INDEX = path.join(DIST, 'index.html')

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

if (!fs.existsSync(INDEX)) {
  console.error('dist/index.html not found: run `npm run build` first')
  process.exit(1)
}

http
  .createServer((request, response) => {
    const url = request.url ?? '/'

    // An address from the time under /hangelo: the same address without it.
    if (url === OLD_BASE || url.startsWith(OLD_BASE + '/') || url.startsWith(OLD_BASE + '?')) {
      const rest = url.slice(OLD_BASE.length)
      response.writeHead(302, { location: rest.startsWith('/') ? rest : '/' + rest })
      response.end()
      return
    }

    if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) {
      forwardToBackend(request, response, url.slice('/api'.length) || '/')
    } else {
      serveFile(request, response, url)
    }
  })
  .listen(PORT, () => {
    console.log('UI on port ' + PORT + ', /api -> ' + API_URL.origin)
  })

function forwardToBackend(request, response, backendPath) {
  const client = API_URL.protocol === 'https:' ? https : http

  const headers = { ...request.headers, host: API_URL.host }

  const outgoing = client.request(
    {
      protocol: API_URL.protocol,
      hostname: API_URL.hostname,
      port: API_URL.port || undefined,
      method: request.method,
      path: backendPath,
      headers,
    },
    (incoming) => {
      response.writeHead(incoming.statusCode ?? 502, incoming.headers)
      incoming.pipe(response)
    },
  )

  outgoing.on('error', (error) => {
    console.error('backend unreachable: ' + error.message)
    if (!response.headersSent) {
      response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
    }
    response.end(JSON.stringify({ code: 'backend_unreachable', message: 'The server is not available. Try again in a minute.' }))
  })

  // WHY: a request that stays open (the stream of signals) ends when the browser leaves, not when
  // the backend answers. Without this the connection to the backend would stay open after the
  // page is gone, one more for every reload.
  response.on('close', () => outgoing.destroy())

  request.pipe(outgoing)
}

function serveFile(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' })
    response.end()
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  } catch {
    response.writeHead(400)
    response.end()
    return
  }

  // Never leave dist/, whatever the path says.
  const requested = path.join(DIST, path.normalize(pathname))
  const inside = requested === DIST || requested.startsWith(DIST + path.sep)
  const isFile = inside && fs.existsSync(requested) && fs.statSync(requested).isFile()

  // A missing file with an extension is a real 404 (a stale asset); any other path is a page of the
  // application, and the application decides what to show.
  if (!isFile && path.extname(pathname) !== '') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  const file = isFile ? requested : INDEX
  const headers = {
    'content-type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    // Files in assets/ have a hash in the name and never change; index.html must always be fresh,
    // otherwise a new release is not picked up.
    'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  }

  response.writeHead(200, headers)
  if (request.method === 'HEAD') {
    response.end()
  } else {
    fs.createReadStream(file).pipe(response)
  }
}
