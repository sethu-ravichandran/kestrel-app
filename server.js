// Kestrel Smart Routing — backend (Node + Luxon, no framework)
// Owns: routing engine, rules, reps, bookings, buffers, SCIM 2.0 deprovisioning, audit log.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const PORT = process.env.PORT || 5178;
const SCIM_TOKEN = process.env.SCIM_TOKEN || 'demo-okta-token';
const DEMO_NOW = DateTime.fromISO('2026-11-23T09:00', { zone: 'Europe/Berlin' });

// ---------- seed data (state lives in memory; POST /api/reset restores it) ----------
function seed() {
  return {
    rrPtr: 0,
    buffer: false,
    reps: [
      { id: 'ana', name: 'Ana Ruiz', email: 'ana@halden.com', terr: 'NA-West', tz: 'America/Los_Angeles', skills: ['general', 'billing'], langs: ['English', 'Spanish'], owns: ['bluecrest.com'], away: false, active: true },
      { id: 'ben', name: 'Ben Carter', email: 'ben@halden.com', terr: 'NA-East', tz: 'America/New_York', skills: ['general'], langs: ['English'], owns: ['pinecove.io'], away: false, active: true },
      { id: 'kofi', name: 'Kofi Mensah', email: 'kofi@halden.com', terr: 'NA-East', tz: 'America/New_York', skills: ['technical', 'general'], langs: ['English', 'French'], owns: [], away: false, active: true },
      { id: 'lena', name: 'Lena Vogel', email: 'lena@halden.com', terr: 'EMEA', tz: 'Europe/Berlin', skills: ['general', 'billing'], langs: ['English', 'German'], owns: ['northfold.de'], away: false, active: true },
      { id: 'javi', name: 'Javier Soto', email: 'javier@halden.com', terr: 'EMEA', tz: 'Europe/Madrid', skills: ['technical', 'general'], langs: ['English', 'Spanish', 'French'], owns: [], away: false, active: true },
      { id: 'mei', name: 'Mei Tan', email: 'mei@halden.com', terr: 'APAC', tz: 'Asia/Singapore', skills: ['general', 'technical'], langs: ['English'], owns: ['harbourline.sg'], away: false, active: true },
      { id: 'sam', name: 'Sam Patel', email: 'sam@halden.com', terr: 'NA-West', tz: 'America/Los_Angeles', skills: ['technical', 'general'], langs: ['English'], owns: [], away: false, active: true },
    ],
    rules: [
      { k: 'owner', on: true, t: 'Existing customer → their account owner', d: 'Matches the email domain to named accounts' },
      { k: 'terr', on: true, t: "Territory → reps covering the invitee's region", d: "Also keeps the meeting inside both people's working day" },
      { k: 'skill', on: true, t: 'Topic → reps with that skill', d: 'Technical calls only go to solution engineers' },
      { k: 'lang', on: true, t: 'Language → reps who speak it', d: 'Soft rule: dropped if nobody matches' },
    ],
    bookings: [
      { id: 'BK-1', repId: 'ana', who: 'ops@bluecrest.com', start: '2026-11-25T18:00:00Z', tz: 'America/Los_Angeles' },
      { id: 'BK-2', repId: 'ana', who: 'cto@bluecrest.com', start: '2026-11-27T17:00:00Z', tz: 'America/Los_Angeles' },
      { id: 'BK-3', repId: 'lena', who: 'cfo@northfold.de', start: '2026-11-24T10:00:00Z', tz: 'Europe/Berlin' },
    ],
    audit: [
      { t: DateTime.now().minus({ days: 2 }).toISO(), who: 'okta-scim', ev: 'User provisioned', d: 'Sam Patel added to NA-West' },
      { t: DateTime.now().minus({ days: 1 }).toISO(), who: 'ops@halden', ev: 'Routing rule changed', d: '"Territory" moved above "Topic"' },
    ],
  };
}
let DB = seed();

const LOCS = [
  ['Seattle, US', 'America/Los_Angeles', 'NA-West'], ['San Francisco, US', 'America/Los_Angeles', 'NA-West'],
  ['Toronto, CA', 'America/Toronto', 'NA-East'], ['New York, US', 'America/New_York', 'NA-East'],
  ['London, UK', 'Europe/London', 'EMEA'], ['Madrid, ES', 'Europe/Madrid', 'EMEA'], ['Berlin, DE', 'Europe/Berlin', 'EMEA'],
  ['Singapore', 'Asia/Singapore', 'APAC'], ['Sydney, AU', 'Australia/Sydney', 'APAC'],
];

const log = (who, ev, d) => DB.audit.unshift({ t: DateTime.now().toISO(), who, ev, d });
const domain = (e) => (String(e).split('@')[1] || '').toLowerCase();
const rep = (id) => DB.reps.find((r) => r.id === id);

// ---------- routing engine ----------
function route(inv, advance = false) {
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
  const idx = DB.rrPtr % pool.length;
  if (advance) DB.rrPtr++;
  const r = pool[idx];
  trace.push({ t: 'Round robin within the remaining group', r: `${r.name} (next in line of ${pool.length})`, s: 'ok' });
  return { rep: r, trace, why: 'rules' };
}

// free slots: inside rep's 9–17 AND invitee's 8–19, not clashing with bookings (+buffer)
function slots(r, invTz, n = 9) {
  const out = [];
  const buf = DB.buffer ? 10 : 0;
  const taken = DB.bookings.filter((b) => b.repId === r.id).map((b) => DateTime.fromISO(b.start));
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
  const saved = DB.rrPtr; DB.rrPtr = 0;
  let oldGood = 0, good = 0;
  const rows = T.map((t, i) => {
    const L = LOCS.find((l) => l[0] === t[1]);
    const inv = { email: t[0], loc: t[1], tz: L[1], terr: L[2], topic: t[2], lang: t[3] };
    const old = live[i % live.length];
    const neu = route(inv, true).rep;
    const fit = (r) => { if (!r) return false; const o = live.find((x) => x.owns.includes(domain(inv.email))); return o ? r === o : r.terr === inv.terr && r.skills.includes(inv.topic); };
    const a = fit(old), b = fit(neu); oldGood += a; good += b;
    return { inv, old: old.name, oldFit: a, neu: neu ? neu.name : '—', neuFit: b };
  });
  DB.rrPtr = saved;
  return { rows, oldGood, good, total: T.length };
}

// SCIM 2.0: deactivate user → remove from routing, hand over accounts + meetings
function deprovision(r) {
  if (!r.active) return { already: true };
  r.active = false;
  const peer = DB.reps.find((x) => x !== r && x.active && x.terr === r.terr) || DB.reps.find((x) => x !== r && x.active);
  const owns = r.owns.splice(0);
  peer.owns.push(...owns);
  const moved = DB.bookings.filter((b) => b.repId === r.id);
  moved.forEach((b) => (b.repId = peer.id));
  log('okta-scim', 'User deprovisioned', `${r.name} deactivated in Okta`);
  log('kestrel', 'Removed from routing', `${r.name} out of ${r.terr} pool`);
  if (owns.length) log('kestrel', 'Accounts reassigned', `${owns.join(', ')} → ${peer.name}`);
  log('kestrel', 'Meetings reassigned', `${moved.length} upcoming meetings → ${peer.name}; invitees notified`);
  return { rep: r.name, peer: peer.name, accounts: owns, meetings: moved.length };
}

const scimUser = (r) => ({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], id: r.id, userName: r.email, displayName: r.name, active: r.active });

// ---------- http ----------
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
const readBody = (req) => new Promise((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { ok({}); } }); });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname, m = req.method;
  if (m === 'OPTIONS') return send(res, 204, '');
  try {
    if (p === '/api/state' && m === 'GET') return send(res, 200, { reps: DB.reps, rules: DB.rules, buffer: DB.buffer, locs: LOCS, now: DEMO_NOW.toISO() });
    if (p === '/api/route' && m === 'POST') {
      const inv = await readBody(req);
      const r = route(inv);
      return send(res, 200, { ...r, slots: r.rep ? slots(r.rep, inv.tz) : [] });
    }
    if (p === '/api/bookings' && m === 'GET') return send(res, 200, DB.bookings);
    if (p === '/api/bookings' && m === 'POST') {
      const { inv, start } = await readBody(req);
      const r = route(inv, true).rep;
      if (!r) return send(res, 409, { error: 'No available rep' });
      if (!slots(r, inv.tz, 40).includes(DateTime.fromISO(start).toUTC().toISO())) return send(res, 409, { error: 'That time was just taken. Please pick another.' });
      const b = { id: 'BK-' + (DB.bookings.length + 1), repId: r.id, who: inv.email, start, tz: inv.tz };
      DB.bookings.push(b);
      log('booking-page', 'Meeting booked', `${inv.email} → ${r.name} (${DateTime.fromISO(start).setZone(r.tz).toFormat('d LLL HH:mm')} ${r.tz})`);
      return send(res, 201, { booking: b, rep: r, buffer: DB.buffer });
    }
    if (p === '/api/rules' && m === 'PUT') {
      const { rules } = await readBody(req);
      if (!Array.isArray(rules) || rules.length !== DB.rules.length) return send(res, 400, { error: 'bad rules' });
      DB.rules = rules.map((x) => ({ ...DB.rules.find((r) => r.k === x.k), on: !!x.on }));
      log('ops@halden', 'Routing rules updated', DB.rules.map((r, i) => `${i + 1}.${r.k}${r.on ? '' : '(off)'}`).join(' '));
      return send(res, 200, DB.rules);
    }
    let mm;
    if ((mm = p.match(/^\/api\/reps\/(\w+)$/)) && m === 'PATCH') {
      const r = rep(mm[1]); if (!r) return send(res, 404, { error: 'no rep' });
      const b = await readBody(req); r.away = !!b.away;
      log('ops@halden', r.away ? 'Rep marked on leave' : 'Rep back from leave', r.name);
      return send(res, 200, r);
    }
    if (p === '/api/buffer' && m === 'POST') {
      DB.buffer = !!(await readBody(req)).on;
      log('ops@halden', DB.buffer ? 'Buffer turned on' : 'Buffer turned off', '10 min after every meeting · all reps');
      return send(res, 200, { buffer: DB.buffer });
    }
    if (p === '/api/simulate' && m === 'GET') return send(res, 200, simulate());
    if (p === '/api/audit' && m === 'GET') return send(res, 200, DB.audit);
    if (p === '/api/audit.csv' && m === 'GET') {
      const csv = 'time,actor,event,detail\n' + DB.audit.map((a) => [a.t, a.who, a.ev, a.d].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="kestrel-audit-log.csv"');
      return send(res, 200, csv, 'text/csv');
    }
    if (p === '/api/reset' && m === 'POST') { DB = seed(); return send(res, 200, { ok: true }); }

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
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream';
      return send(res, 200, fs.readFileSync(file), type);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { console.error(e); send(res, 500, { error: e.message }); }
});
server.listen(PORT, () => console.log(`Kestrel Smart Routing on http://localhost:${PORT}`));
