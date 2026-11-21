# Kestrel Smart Routing (prototype)

Routes each booking to the right rep: account owner → territory → skill → language, with round robin only as a tiebreak. Every booking shows *why*. Also includes SCIM 2.0 deprovisioning (Okta), a one-click buffer nudge, and an audit log with CSV export.

**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui components (`client/`) · Node.js API + Luxon (`server.js`).

```
npm run build   # builds client into public/
npm start       # http://localhost:5178
```
SCIM: `curl -X PATCH -H "Authorization: Bearer demo-okta-token" -d '{"Operations":[{"op":"replace","value":{"active":false}}]}' localhost:5178/scim/v2/Users/ana`
