// Storage layer. The routing engine only talks to this module, never to a database directly.
//
// Prototype: in-memory store, seeded from data/seed.json on boot and on reset.
// Production: implement the same interface (below) on Postgres or Redis
// (e.g. Vercel KV / Upstash) and swap it in here. Nothing in server.js needs to change.
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const SEED_FILE = process.env.SEED_FILE || path.join(__dirname, 'data', 'seed.json');

function loadSeed() {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  // audit entries are stored relative to "now" so the demo always looks fresh
  seed.audit = seed.audit.map(({ daysAgo, ...a }) => ({ t: DateTime.now().minus({ hours: Math.round((daysAgo || 0) * 24) }).toISO(), ...a }));
  return seed;
}

/**
 * Store interface (every implementation must provide these):
 *   getState()                 → { reps, rules, buffer, rrPtr, bookings, audit }
 *   listBookings()             → Booking[]
 *   saveBooking(booking)       → Booking
 *   updateBooking(id, patch)   → Booking | null
 *   appendAudit(entry)         → void   (newest first)
 *   listAudit()                → Audit[]
 *   saveRules(rules)           → Rule[]
 *   updateRep(id, patch)       → Rep | null
 *   setBuffer(on)              → boolean
 *   nextRoundRobin()           → number (atomic counter in a real DB)
 *   reset()                    → state re-seeded from fixture
 *   version()                  → number, bumped on every write (cache key for derived data / ETags)
 */
function createMemoryStore() {
  let state = loadSeed();
  let ver = 1;
  const w = (fn) => (...a) => { ver++; return fn(...a); };
  return {
    version: () => ver,
    getState: () => state,
    listBookings: () => state.bookings,
    saveBooking: w((b) => { state.bookings.push(b); return b; }),
    updateBooking: w((id, patch) => { const b = state.bookings.find((x) => x.id === id); if (b) Object.assign(b, patch); return b || null; }),
    appendAudit: w((e) => { state.audit.unshift(e); }),
    listAudit: () => state.audit,
    saveRules: w((rules) => (state.rules = rules)),
    updateRep: w((id, patch) => { const r = state.reps.find((x) => x.id === id); if (r) Object.assign(r, patch); return r || null; }),
    setBuffer: w((on) => (state.buffer = !!on)),
    nextRoundRobin: w(() => state.rrPtr++),
    reset: w(() => (state = loadSeed())),
  };
}

module.exports = { createMemoryStore };
