// Storage layer. The routing engine only talks to this module, never to a database directly.
//
// Prototype: in-memory store, seeded from data/seed.json on boot and on reset.
// Production: implement the same interface ({ state, reset }) on Postgres or Redis
// (e.g. Vercel KV / Upstash) and swap it in here. Nothing in server.js needs to change.
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const SEED_FILE = process.env.SEED_FILE || path.join(__dirname, 'data', 'seed.json');

function loadSeed() {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  // audit entries are stored relative to "now" so the demo always looks fresh
  seed.audit = seed.audit.map(({ daysAgo, ...a }) => ({ t: DateTime.now().minus({ days: daysAgo || 0 }).toISO(), ...a }));
  return seed;
}

function createMemoryStore() {
  let state = loadSeed();
  return {
    get state() { return state; },
    reset() { state = loadSeed(); return state; },
  };
}

module.exports = { createMemoryStore };
