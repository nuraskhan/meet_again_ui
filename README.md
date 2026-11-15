# Hangelo: the web application

**Less planning. More hanging out.**

Hangelo turns your friends' different schedules, budgets, interests and locations into one confirmed
plan. This repository is what people see in the browser; the server lives in
[meet_again](https://github.com/nuraskhan/meet_again), and its README tells what the product does.

Try it: https://meet-again-ui-112b5408b3d1.herokuapp.com/

```mermaid
flowchart LR
    Browser --> UI[Web app :19000] --> Server[Server :29000]
```

## Run it

You need Node 22.18 or newer, and the server running on http://localhost:29000 (`make start` in
`meet_again`).

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:19000 and log in as `alice@demo.test` with the password `demo123`.

| Command | What it does |
|---------|--------------|
| `npm run dev` | The application with hot reload |
| `npm run build` | Type check and production build into `dist/` |
| `npm start` | Serves `dist/` the way Heroku does; needs `npm run build` first |

## Deployment

Heroku runs `npm start` (see `Procfile`), which is `server.js`: it serves the built application and
forwards `/api/*` to the server.

| Variable | Meaning | Default |
|----------|---------|---------|
| `PORT` | Where to listen; Heroku sets it | `19000` |
| `API_URL` | Address of the server | `http://localhost:29000` |

## More

- Design documents, page by page: [design](design).
