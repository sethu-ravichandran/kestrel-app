// Kestrel Smart Routing — backend (Node + Luxon, no framework)
// Owns: routing engine, rules, reps, bookings, buffers, SCIM 2.0 deprovisioning, audit log.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { DateTime, IANAZone } = require('luxon');

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
// id → rep index, rebuilt only when the store version changes
let repIdx = { v: -1, map: new Map() };
const rep = (id) => {
  if (repIdx.v !== store.version()) repIdx = { v: store.version(), map: new Map(DB.reps.map((r) => [r.id, r])) };
  return repIdx.map.get(id);
};
// memoize pure functions of store state, keyed on store.version()
const memo = (fn) => { let v = -1, val; return () => (v === store.version() ? val : ((v = store.version()), (val = fn()))); };

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
  const before = DB.buffer ? DB.bufferBefore || 0 : 0, after = DB.buffer ? DB.bufferAfter || 0 : 0;
  const taken = DB.bookings.filter((b) => b.repId === r.id && b.status !== 'cancelled').map((b) => DateTime.fromISO(b.start));
  let d = DEMO_NOW.setZone(r.tz).startOf('day').plus({ days: 1 });
  for (let guard = 0; out.length < n && guard < 30; guard++, d = d.plus({ days: 1 })) {
    if (d.weekday > 5) continue;
    for (let m = 9 * 60; m < 17 * 60 && out.length < n; m += 30) { // 30-min grid so buffers matter
      const h = Math.floor(m / 60), s = d.set({ hour: h, minute: m % 60 });
      if ((r.id.charCodeAt(0) + s.day * 7 + h * 3) % 5 < 2) continue; // pseudo calendar-busy
      const ih = s.setZone(invTz).hour;
      if (ih < 8 || ih >= 19) continue;
      // each meeting occupies [start - before, start + 30 + after]; two overlap when starts are closer than 30 + before + after
      const clash = taken.some((t) => Math.abs(t.diff(s, 'minutes').minutes) < 30 + before + after);
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
  if (!peer) { store.updateRep(r.id, { active: true }); return { error: 'no active peer to hand over to' }; }
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


// ---------- insights: last 8 weeks (deterministic synthetic history + live bookings) ----------
function insights() {
  let seedN = 7; const rnd = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280);
  const heat = Array.from({ length: 5 }, () => Array(10).fill(0)); // Mon-Fri x 08..17 rep-local
  const weeks = [];
  const reps = DB.reps.map((r) => ({ id: r.id, name: r.name, terr: r.terr, active: r.active, trend: [] }));
  for (let w = 7; w >= 0; w--) {
    const total = 38 + Math.round(rnd() * 14) + (7 - w) * 2;
    const after = w <= 3; // smart routing switched on 4 weeks ago
    const owner = Math.round(total * (after ? 0.34 : 0.0)), terr = Math.round(total * (after ? 0.33 : 0)), skill = Math.round(total * (after ? 0.21 : 0));
    weeks.push({ label: DEMO_NOW.minus({ weeks: w }).startOf('week').toFormat('d LLL'), owner, terr, skill, rr: total - owner - terr - skill, right: Math.round(total * (after ? 0.95 + rnd() * 0.04 : 0.2 + rnd() * 0.1)), total });
    reps.forEach((r) => r.trend.push(Math.round(4 + rnd() * 6 + (r.id === 'ana' && !after ? 5 : 0))));
    for (let i = 0; i < total; i++) { const d = Math.floor(rnd() * 5), h = Math.min(9, Math.floor(Math.abs(rnd() + rnd() - 1) * 6 + (rnd() < 0.5 ? 1 : 5))); heat[d][h]++; }
  }
  DB.bookings.filter((b) => b.status === 'confirmed').forEach((b) => { const r = rep(b.repId); if (!r) return; const s = DateTime.fromISO(b.start).setZone(r.tz); if (s.weekday <= 5 && s.hour >= 8 && s.hour < 18) heat[s.weekday - 1][s.hour - 8]++; });
  const last = weeks.slice(-4), prev = weeks.slice(0, 4);
  const sum = (a, k) => a.reduce((x, y) => x + y[k], 0);
  return {
    weeks, heat, reps,
    kpis: { bookings30: sum(last, 'total'), rightNow: Math.round(100 * sum(last, 'right') / sum(last, 'total')), rightBefore: Math.round(100 * sum(prev, 'right') / sum(prev, 'total')), reassignsSaved: sum(last, 'right') - Math.round(sum(last, 'total') * 0.25) },
  };
}

const scimUser = (r) => ({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], id: r.id, userName: r.email, displayName: r.name, active: r.active });

// ---------- http ----------
const MAX_BODY = 100 * 1024;
const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'ETag, X-Request-Id',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
};
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function send(res, code, body, type = 'application/json', extra = {}) {
  const req = res.req;
  let buf = type === 'application/json' ? Buffer.from(JSON.stringify(body)) : Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const headers = { ...BASE_HEADERS, 'Content-Type': type.includes('charset') || !/json|text|javascript|svg/.test(type) ? type : type + '; charset=utf-8', ...extra };
  if (req && (req.method === 'GET' || req.method === 'HEAD') && code === 200) {
    const etag = headers.ETag || '"' + crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 22) + '"';
    headers.ETag = etag;
    if (!headers['Cache-Control']) headers['Cache-Control'] = 'no-cache';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
  }
  const ae = (req && req.headers['accept-encoding']) || '';
  if (buf.length > 1024 && /json|text|javascript|svg|css|csv/.test(type)) {
    headers.Vary = 'Accept-Encoding';
    if (/\bbr\b/.test(ae)) { buf = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); headers['Content-Encoding'] = 'br'; }
    else if (/\bgzip\b/.test(ae)) { buf = zlib.gzipSync(buf); headers['Content-Encoding'] = 'gzip'; }
  }
  if (code !== 204) headers['Content-Length'] = buf.length;
  res.writeHead(code, headers);
  res.end(code === 204 ? undefined : buf);
}
// body size limit → 413, malformed JSON → 400 (previously silently became {})
const readBody = (req) => new Promise((ok, fail) => {
  if (req.body !== undefined && typeof req.body === 'object') return ok(req.body || {}); // pre-parsed (serverless)
  const chunks = []; let n = 0, done = false;
  req.on('data', (c) => { if (done) return; n += c.length; if (n > MAX_BODY) { done = true; fail(new HttpError(413, 'Request body too large')); req.resume(); } else chunks.push(c); });
  req.on('end', () => { if (done) return; const s = Buffer.concat(chunks).toString('utf8'); try { const v = s ? JSON.parse(s) : {}; ok(v && typeof v === 'object' ? v : {}); } catch { fail(new HttpError(400, 'Invalid JSON body')); } });
  req.on('error', fail);
});
const isStr = (v) => typeof v === 'string' && v.length > 0 && v.length < 320;
function validInvitee(inv) {
  if (!inv || typeof inv !== 'object') throw new HttpError(400, 'invitee is required');
  if (!isStr(inv.email) || !inv.email.includes('@')) throw new HttpError(400, 'valid email is required');
  if (!isStr(inv.tz) || !IANAZone.isValidZone(inv.tz)) throw new HttpError(400, 'valid IANA tz is required');
  return inv;
}
const safeEq = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const memoInsights = memo(insights), memoSimulate = memo(simulate);
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json', '.txt': 'text/plain' };

async function handler(req, res) {
  const t0 = process.hrtime.bigint();
  const rid = String(req.headers['x-request-id'] || crypto.randomUUID()).slice(0, 64);
  res.setHeader('X-Request-Id', rid);
  res.req = res.req || req;
  res.on('finish', () => { if (process.env.ACCESS_LOG !== '0') console.log(JSON.stringify({ rid, m: req.method, p: req.url, s: res.statusCode, ms: Number(process.hrtime.bigint() - t0) / 1e6 })); });
  let url;
  try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, { error: 'bad url' }); }
  const p = url.pathname, m = req.method;
  if (m === 'OPTIONS') return send(res, 204, '');
  try {
    if (p === '/api/state' && m === 'GET') return send(res, 200, { reps: DB.reps, rules: DB.rules, buffer: DB.buffer, bufferBefore: DB.bufferBefore || 0, bufferAfter: DB.bufferAfter || 0, locs: LOCS, now: DEMO_NOW.toISO() });
    if (p === '/api/route' && m === 'POST') {
      const inv = validInvitee(await readBody(req));
      const r = route(inv);
      return send(res, 200, { ...r, slots: r.rep ? slots(r.rep, inv.tz, 60) : [] });
    }
    if (p === '/api/bookings' && m === 'GET') return send(res, 200, store.listBookings());
    if (p === '/api/bookings' && m === 'POST') {
      const { inv, start } = await readBody(req);
      validInvitee(inv);
      if (!isStr(start) || !DateTime.fromISO(start).isValid) throw new HttpError(400, 'valid ISO start is required');
      // check + save run synchronously (no await in between), so the double-booking guard is atomic in this process
      const routed = route(inv, true); const r = routed.rep;
      if (!r) return send(res, 409, { error: 'No available rep' });
      if (!slots(r, inv.tz, 40).includes(DateTime.fromISO(start).toUTC().toISO())) return send(res, 409, { error: 'That time was just taken. Please pick another.' });
      const b = { id: 'BK-' + (DB.bookings.length + 1), repId: r.id, who: inv.email, start, tz: inv.tz, topic: inv.topic, why: routed.why, status: 'confirmed' };
      store.saveBooking(b);
      log('booking-page', 'Meeting booked', `${inv.email} → ${r.name} (${DateTime.fromISO(start).setZone(r.tz).toFormat('d LLL HH:mm')} ${r.tz})`);
      return send(res, 201, { booking: b, rep: r, buffer: DB.buffer, bufferBefore: DB.bufferBefore || 0, bufferAfter: DB.bufferAfter || 0 });
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
      const bb = await readBody(req); const mins = (v) => (v == null ? null : Math.max(0, Math.min(60, Math.round(Number(v) || 0))));
      const out = store.setBuffer(bb.on, mins(bb.before), mins(bb.after));
      log('ops@halden', out.buffer ? 'Buffer updated' : 'Buffer turned off', out.buffer ? `${out.bufferBefore} min before, ${out.bufferAfter} min after every meeting · all reps` : 'All reps');
      return send(res, 200, out);
    }
    if (p === '/api/insights' && m === 'GET') return send(res, 200, memoInsights());
    if (p === '/api/simulate' && m === 'GET') return send(res, 200, memoSimulate());
    if (p === '/api/audit' && m === 'GET') return send(res, 200, store.listAudit());
    if (p === '/api/audit.csv' && m === 'GET') {
      const csv = 'time,actor,event,detail\n' + DB.audit.map((a) => [a.t, a.who, a.ev, a.d].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="kestrel-audit-log.csv"');
      return send(res, 200, csv, 'text/csv');
    }
    if (p === '/api/reset' && m === 'POST') { store.reset(); return send(res, 200, { ok: true }); }

    // SCIM 2.0 (what Okta calls)
    if (p.startsWith('/scim/v2/')) {
      if (!safeEq(req.headers.authorization, 'Bearer ' + SCIM_TOKEN)) return send(res, 401, { schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '401', detail: 'Bad token' });
      if (p === '/scim/v2/Users' && m === 'GET') return send(res, 200, { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: DB.reps.length, Resources: DB.reps.map(scimUser) });
      if ((mm = p.match(/^\/scim\/v2\/Users\/(\w+)$/))) {
        const r = rep(mm[1]); if (!r) return send(res, 404, { status: '404' });
        if (m === 'GET') return send(res, 200, scimUser(r));
        if (m === 'PATCH') {
          const b = await readBody(req);
          const off = (b.Operations || []).some((o) => o.value && o.value.active === false || (o.path === 'active' && o.value === false));
          const result = off ? deprovision(r) : {};
          if (result.error) return send(res, 409, { schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: '409', detail: result.error });
          return send(res, 200, { ...scimUser(r), 'urn:kestrel:handover': result });
        }
      }
    }

    if (p.startsWith('/api/') || p.startsWith('/scim/')) return send(res, 404, { error: 'not found' });

    // static frontend (GET/HEAD only); resolve + prefix check blocks path traversal
    if (m === 'GET' || m === 'HEAD') {
      let rel; try { rel = decodeURIComponent(p); } catch { return send(res, 400, { error: 'bad path' }); }
      const file = path.resolve(PUBLIC, '.' + (rel === '/' ? '/index.html' : rel));
      if (file.startsWith(PUBLIC + path.sep)) {
        let st; try { st = fs.statSync(file); } catch { st = null; }
        if (st && st.isFile()) {
          const ext = path.extname(file);
          const cache = rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
          return send(res, 200, fs.readFileSync(file), MIME[ext] || 'application/octet-stream', { 'Cache-Control': cache, ETag: `W/"${st.size.toString(16)}-${st.mtimeMs.toString(16)}"` });
        }
      }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.code, { error: e.message });
    console.error(e); send(res, 500, { error: 'internal error' });
  }
}
module.exports = handler;
module.exports.handler = handler;
if (require.main === module) {
  const server = http.createServer(handler);
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.listen(PORT, () => console.log(`Kestrel Smart Routing on http://localhost:${PORT}`));
  const stop = () => { console.log('shutting down'); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
