# Kestrel Smart Routing (prototype)

Routes each booking to the right rep (account owner → territory → skill → language, then round robin) and shows *why*. Also includes SCIM 2.0 deprovisioning (Okta), a one-click buffer nudge, and an audit log with CSV export.

```
apps/
  web/      React 18 + TypeScript + Vite + Tailwind + shadcn/ui (customer booking page + routing settings)
  api/      Node.js API: routing engine, bookings, SCIM 2.0, audit log; serves the built web app from public/
            store.js        storage interface (in-memory today)
            data/seed.json  fixture loaded on boot and on POST /api/reset
packages/
  shared/   TypeScript contracts shared across apps (Rep, Rule, Invitee, RouteRes…)
```

```
npm install
npm run build    # builds apps/web into apps/api/public
npm start        # http://localhost:5178
npm run dev      # API + Vite dev server with proxy
```
SCIM: `curl -X PATCH -H "Authorization: Bearer demo-okta-token" -d '{"Operations":[{"op":"replace","value":{"active":false}}]}' localhost:5178/scim/v2/Users/ana`

## Persistence (deliberate trade-off)
**In-memory by design for a 2-hour prototype. Persistence is behind an interface, and `apps/api/store.js` is the one file you'd change.**

- `apps/api/data/seed.json`: fixture loaded on every boot and on `POST /api/reset`, so the demo always starts from a known state.
- `apps/api/store.js`: the storage interface (`getState`, `listBookings`, `saveBooking`, `updateBooking`, `appendAudit`, `listAudit`, `saveRules`, `updateRep`, `setBuffer`, `nextRoundRobin`, `reset`). Every write in `server.js` goes through it; the routing engine only reads.
- Production: implement the same interface on Postgres (bookings, reps, rules, audit tables) or Redis / Vercel KV, and make `nextRoundRobin` an atomic counter. Routing logic, API and UI don't change.
- On serverless hosts each cold start re-seeds. That's acceptable for a demo, and it's exactly the gap a real store closes.

## Backend notes

What was optimized (zero new dependencies, same endpoints and response shapes):
- **Caching:** the store bumps a `version()` counter on every write. `/api/insights` and `/api/simulate` are memoized on it, and so is the rep-by-id Map index. GET responses carry an ETag and `Cache-Control: no-cache`, so a repeat request gets a 304. Hashed `/assets/*` files are served `immutable` for a year, and `index.html` is `no-cache`.
- **Compression:** JSON, CSV and static responses over 1 KB are compressed with brotli or gzip, based on `Accept-Encoding`.
- **Request hygiene:** bodies are capped at 100 KB (larger ones get 413). Malformed JSON now gets a 400; before, it was silently treated as `{}`. `/api/route` and `/api/bookings` check the email, IANA tz and ISO start. Errors share one `{ error }` shape, unknown `/api` routes return 404, and 500s no longer leak internal messages. Responses carry `nosniff` and `Referrer-Policy` headers. The SCIM token is compared in constant time.
- **Robustness:** the static path is resolved and checked against the public folder prefix, which blocks traversal. SCIM deprovisioning with no active peer to take over now returns 409 instead of crashing. Each request gets an `X-Request-Id` and one structured JSON access-log line with its duration. The server shuts down gracefully on SIGTERM.
- The double-booking check and the save run synchronously with no `await` between them, so they are atomic within a single process.

What I'd do next for real scale:
- Move to Postgres, with indexes on `bookings(rep_id, start)` and a unique constraint on `(rep_id, start)` so the database enforces the double-booking guard. Use a sequence for the round-robin pointer.
- Put a Redis cache in front of the derived data (insights, slot availability), invalidated by version.
- Run stateless API instances horizontally behind a load balancer, all sharing the store.
- Add rate limiting per IP and per SCIM token.
- Send notifications and audit fan-out through a queue (SQS or BullMQ) with retries.
- Add structured logs, metrics and tracing (OpenTelemetry).
