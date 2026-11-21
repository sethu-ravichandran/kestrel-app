# Kestrel Smart Routing (prototype)

Routes each booking to the right rep using owner → territory → skill → language rules, with round robin as a tiebreak. Includes SCIM 2.0 deprovisioning, a buffer nudge and an audit log.

- `server.js`: Node backend (routing engine, bookings API, `PATCH /scim/v2/Users/:id`, audit log + CSV)
- `public/index.html`: frontend (shadcn-style UI, Luxon for time zones)

Run: `npm install && npm start` → http://localhost:5178
SCIM demo: `curl -X PATCH -H "Authorization: Bearer demo-okta-token" -d '{"Operations":[{"op":"replace","value":{"active":false}}]}' localhost:5178/scim/v2/Users/ana`
