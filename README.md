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
