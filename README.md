# Kestrel Smart Routing (prototype)

Routes each booking to the right rep (account owner → territory → skill → language, then round robin) and shows *why*. Also includes SCIM 2.0 deprovisioning (Okta), a one-click buffer nudge, and an audit log with CSV export.

```
apps/
  web/      React 18 + TypeScript + Vite + Tailwind + shadcn/ui (customer booking page + routing settings)
  api/      Node.js API: routing engine, bookings, SCIM 2.0, audit log; serves the built web app from public/
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
