// Kestrel Smart Routing — backend (Node + Luxon, no framework)
// Owns: routing engine, rules, reps, bookings, buffers, SCIM 2.0 deprovisioning, audit log.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const PORT = process.env.PORT || 5178;
const SCIM_TOKEN = process.env.SCIM_TOKEN || 'demo-okta-token';
const DEMO_NOW = DateTime.fromISO('2026-11-23T09:00', { zone: 'Europe/Berlin' });

// ---------- storage (see store.js: in-memory now, swappable for Postgres/Redis) ----------
const store = require('./store').createMemoryStore();
// read-only view for the routing engine; always points at the store's current state
const DB = new Proxy({}, { get: (_, k) => store.getState()[k] });

const LOCS = [
  ['Seattle, US', 'America/Los_Angeles', 'NA-West'], ['San Francisco, US', 'America/Los_Angeles', 'NA-West'],
  ['Toronto, CA', 'America/Toronto', 'NA-East'], ['New York, US', 'America/New_York', 'NA-East'],
  ['London, UK', 'Europe/London', 'EMEA'], ['Madrid, ES', 'Europe/Madrid', 'EMEA'], ['Berlin, DE', 'Europe/Berlin', 'EMEA'],
  ['Singapore', 'Asia/Singapore', 'APAC'], ['Sydney, AU', 'Australia/Sydney', 'APAC'],
];

const log = (who, ev, d) => store.appendAudit({ t: DateTime.now().toISO(), who, ev, d });
const domain = (e) => (String(e).split('@')[1] || '').toLowerCase();
const rep = (id) => DB.reps.find((r) => r.id === id);

// ---------- routing engine ----------
// sim: optional local round-robin counter so the simulator never touches real state
function route(inv, advance = false, sim = null) {
  const trace = [];
  let pool = DB.reps.filter((r) => r.active && !r.away);
  for (const R of DB.rules) {
    if (!R.on) { trace.push({ t: R.t, r: 'skipped (off)', s: 'mut' }); continue; }
    if (R.k === 'owner') {
      const o = DB.reps.find((r) => r.active && r.owns.includes(domain(inv.email)));
      if (!o) { trace.push({ t: R.t, r: 'Not an existing account', s: 'mut' }); continue; }
      if (o.away) { trace.push({ t: R.t, r: `${o.name} owns this account but is on leave, so falling back to the next rule`, s: 'warn' }); continue; }
      trace.push({ t: R.t, r: `${domain(inv.email)} is owned by ${o.name} ✓`, s: 'ok' });
      return { rep: o, trace, why: 'owner' };
    }
    const f = { terr: (r) => r.terr === inv.terr, skill: (r) => r.skills.includes(inv.topic), lang: (r) => r.langs.includes(inv.lang) }[R.k];
    const next = pool.filter(f);
    if (next.length) { trace.push({ t: R.t, r: next.map((r) => r.name).join(', '), s: 'ok' }); pool = next; }
    else trace.push({ t: R.t, r: 'No match, rule relaxed', s: 'warn' });
  }
  if (!pool.length) return { rep: null, trace, why: 'none' };
  const idx = (sim ? sim.n++ : DB.rrPtr) % pool.length;
  if (advance && !sim) store.nextRoundRobin();
  const r = pool[idx];
  trace.push({ t: 'Round robin within the remaining group', r: `${r.name} (next in line of ${pool.length})`, s: 'ok' });
  return { rep: r, trace, why: 'rules' };
}

// free slots: inside rep's 9–17 AND invitee's 8–19, not clashing with bookings (+buffer)
function slots(r, invTz, n = 9) {
  const out = [];
  const buf = DB.buffer ? 10 : 0;
  const taken = DB.bookings.filter((b) => b.repId === r.id && b.status !== 'cancelled').map((b) => DateTime.fromISO(b.start));
  let d = DEMO_NOW.setZone(r.tz).startOf('day').plus({ days: 1 });
  for (let guard = 0; out.length < n && guard < 30; guard++, d = d.plus({ days: 1 })) {
    if (d.weekday > 5) continue;
    for (let h = 9; h < 17 && out.length < n; h++) {
      const s = d.set({ hour: h });
      if ((r.id.charCodeAt(0) + s.day * 7 + h * 3) % 5 < 2) continue; // pseudo calendar-busy
      const ih = s.setZone(invTz).hour;
      if (ih < 8 || ih >= 19) continue;
      const clash = taken.some((t) => Math.abs(t.diff(s, 'minutes').minutes) < 30 + buf);
      if (!clash) out.push(s.toUTC().toISO());
    }
  }
  return out;
}

function simulate() {
  const T = [['k.ito@pinecove.io', 'New York, US', 'general', 'English'], ['m.lee@gmail.com', 'Seattle, US', 'general', 'English'], ['ops@ferrovia.es', 'Madrid, ES', 'technical', 'Spanish'], ['cfo@northfold.de', 'Berlin, DE', 'billing', 'German'], ['it@harbourline.sg', 'Singapore', 'technical', 'English'], ['dev@acme.ca', 'Toronto, CA', 'technical', 'French'], ['p.ng@tallow.com.au', 'Sydney, AU', 'general', 'English'], ['ann@sfgrowth.com', 'San Francisco, US', 'technical', 'English']];
  const live = DB.reps.filter((r) => r.active);
  const sim = { n: 0 };
  let oldGood = 0, good = 0;
  const rows = T.map((t, i) => {
    const L = LOCS.find((l) => l[0] === t[1]);
    const inv = { email: t[0], loc: t[1], tz: L[1], terr: L[2], topic: t[2], lang: t[3] };
    const old = live[i % live.length];
    const neu = route(inv, false, sim).rep;
    const fit = (r) => { if (!r) return false; const o = live.find((x) => x.owns.includes(domain(inv.email))); return o ? r === o : r.terr === inv.terr && r.skills.includes(inv.topic); };
    const a = fit(old), b = fit(neu); oldGood += a; good += b;
    return { inv, old: old.name, oldFit: a, neu: neu ? neu.name : '—', neuFit: b };
  });
  return { rows, oldGood, good, total: T.length };
}

// SCIM 2.0: deactivate user → remove from routing, hand over accounts + meetings
function deprovision(r) {
  if (!r.active) return { already: true };
  store.updateRep(r.id, { active: false });
  const peer = DB.reps.find((x) => x !== r && x.active && x.terr === r.terr) || DB.reps.find((x) => x !== r && x.active);
  const owns = r.owns.slice();
  store.updateRep(r.id, { owns: [] });
  store.updateRep(peer.id, { owns: [...peer.owns, ...owns] });
  const moved = DB.bookings.filter((b) => b.repId === r.id);
  moved.forEach((b) => store.updateBooking(b.id, { repId: peer.id }));
  log('okta-scim', 'User deprovisioned', `${r.name} deactivated in Okta`);
  log('kestrel', 'Removed from routing', `${r.name} out of ${r.terr} pool`);
  if (owns.length) log('kestrel', 'Accounts reassigned', `${owns.join(', ')} → ${peer.name}`);
  log('kestrel', 'Meetings reassigned', `${moved.length} upcoming meetings → ${peer.name}; invitees notified`);
  return { rep: r.name, peer: peer.name, accounts: owns, meetings: moved.length };
}

const scimUser = (r) => ({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], id: r.id, userName: r.email, displayName: r.name, active: r.active });

// ---------- http ----------
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
const readBody = (req) => new Promise((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { ok({}); } }); });

async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname, m = req.method;
  if (m === 'OPTIONS') return send(res, 204, '');
  try {
    if (p === '/api/state' && m === 'GET') return send(res, 200, { reps: DB.reps, rules: DB.rules, buffer: DB.buffer, locs: LOCS, now: DEMO_NOW.toISO() });
    if (p === '/api/route' && m === 'POST') {
      const inv = await readBody(req);
      const r = route(inv);
      return send(res, 200, { ...r, slots: r.rep ? slots(r.rep, inv.tz, 60) : [] });
    }
    if (p === '/api/bookings' && m === 'GET') return send(res, 200, store.listBookings());
    if (p === '/api/bookings' && m === 'POST') {
      const { inv, start } = await readBody(req);
      const routed = route(inv, true); const r = routed.rep;
      if (!r) return send(res, 409, { error: 'No available rep' });
      if (!slots(r, inv.tz, 40).includes(DateTime.fromISO(start).toUTC().toISO())) return send(res, 409, { error: 'That time was just taken. Please pick another.' });
      const b = { id: 'BK-' + (DB.bookings.length + 1), repId: r.id, who: inv.email, start, tz: inv.tz, topic: inv.topic, why: routed.why, status: 'confirmed' };
      store.saveBooking(b);
      log('booking-page', 'Meeting booked', `${inv.email} → ${r.name} (${DateTime.fromISO(start).setZone(r.tz).toFormat('d LLL HH:mm')} ${r.tz})`);
      return send(res, 201, { booking: b, rep: r, buffer: DB.buffer });
    }
    let cm;
    if ((cm = p.match(/^\/api\/bookings\/([\w-]+)$/)) && m === 'DELETE') {
      const b = store.updateBooking(cm[1], { status: 'cancelled' }); if (!b) return send(res, 404, { error: 'not found' });
      const r = rep(b.repId);
      log('ops@halden', 'Meeting cancelled', `${b.id} · ${b.who} with ${r ? r.name : b.repId}; slot released`);
      return send(res, 200, b);
    }
    if (p === '/api/rules' && m === 'PUT') {
      const { rules } = await readBody(req);
      if (!Array.isArray(rules) || rules.length !== DB.rules.length) return send(res, 400, { error: 'bad rules' });
      store.saveRules(rules.map((x) => ({ ...DB.rules.find((r) => r.k === x.k), on: !!x.on })));
      log('ops@halden', 'Routing rules updated', DB.rules.map((r, i) => `${i + 1}.${r.k}${r.on ? '' : '(off)'}`).join(' '));
      return send(res, 200, DB.rules);
    }
    let mm;
    if ((mm = p.match(/^\/api\/reps\/(\w+)$/)) && m === 'PATCH') {
      const b = await readBody(req); const r = store.updateRep(mm[1], { away: !!b.away }); if (!r) return send(res, 404, { error: 'no rep' });
      log('ops@halden', r.away ? 'Rep marked on leave' : 'Rep back from leave', r.name);
      return send(res, 200, r);
    }
    if (p === '/api/buffer' && m === 'POST') {
      store.setBuffer((await readBody(req)).on);
      log('ops@halden', DB.buffer ? 'Buffer turned on' : 'Buffer turned off', '10 min after every meeting · all reps');
      return send(res, 200, { buffer: DB.buffer });
    }
    if (p === '/api/simulate' && m === 'GET') return send(res, 200, simulate());
    if (p === '/api/audit' && m === 'GET') return send(res, 200, store.listAudit());
    if (p === '/api/audit.csv' && m === 'GET') {
      const csv = 'time,actor,event,detail\n' + DB.audit.map((a) => [a.t, a.who, a.ev, a.d].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="kestrel-audit-log.csv"');
      return send(res, 200, csv, 'text/csv');
    }
    if (p === '/api/reset' && m === 'POST') { store.reset(); return send(res, 200, { ok: true }); }

    // SCIM 2.0 (what Okta calls)
    if (p.startsWith('/scim/v2/')) {
      if (req.headers.authorization !== 'Bearer ' + SCIM_TOKEN) return send(res, 401, { schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Bad token' });
      if (p === '/scim/v2/Users' && m === 'GET') return send(res, 200, { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: DB.reps.length, Resources: DB.reps.map(scimUser) });
      if ((mm = p.match(/^\/scim\/v2\/Users\/(\w+)$/))) {
        const r = rep(mm[1]); if (!r) return send(res, 404, { status: '404' });
        if (m === 'GET') return send(res, 200, scimUser(r));
        if (m === 'PATCH') {
          const b = await readBody(req);
          const off = (b.Operations || []).some((o) => o.value && o.value.active === false || (o.path === 'active' && o.value === false));
          const result = off ? deprovision(r) : {};
          return send(res, 200, { ...scimUser(r), 'urn:kestrel:handover': result });
        }
      }
    }

    // static frontend
    const file = path.join(__dirname, 'public', p === '/' ? 'index.html' : path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (file.startsWith(path.join(__dirname, 'public')) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
      return send(res, 200, fs.readFileSync(file), type);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); send(res, 500, { error: e.message }); }
}
module.exports = handler;
if (require.main === module) http.createServer(handler).listen(PORT, () => console.log(`Kestrel Smart Routing on http://localhost:${PORT}`));
