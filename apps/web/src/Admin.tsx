import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { Activity, ArrowDown, ArrowRightLeft, ArrowUp, CalendarPlus, CalendarX, Download, GitBranch, KeyRound, Lightbulb, Plane, ShieldCheck, Timer, UserPlus, UserX, Wrench } from 'lucide-react'
import { api, apiUrl, city, type Audit, type State, type SimRow } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NativeSelect, Skeleton } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Big, Headline } from '@/components/Headline'

function Count({ v }: { v: number }) {
  const [n, setN] = useState(v); const from = useRef(v)
  useEffect(() => { const a = from.current, t0 = performance.now(); if (a === v) return; let raf = 0
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / 240), e = 1 - Math.pow(1 - p, 3); setN(Math.round(a + (v - a) * e)); if (p < 1) raf = requestAnimationFrame(tick); else from.current = v }
    raf = requestAnimationFrame(tick); return () => { cancelAnimationFrame(raf); from.current = v } }, [v])
  return <>{n}</>
}
function useFlip(keys: string) {
  const refs = useRef(new Map<string, HTMLElement>()), pos = useRef(new Map<string, number>())
  useLayoutEffect(() => { refs.current.forEach((el, k) => { const top = el.getBoundingClientRect().top, prev = pos.current.get(k)
    if (prev !== undefined && prev !== top && !matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' })
    pos.current.set(k, top) }) }, [keys])
  return (k: string) => (el: HTMLElement | null) => { if (el) refs.current.set(k, el); else refs.current.delete(k) }
}
type Sim = { rows: SimRow[]; oldGood: number; good: number; total: number }
const Th = (p: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className="h-9 px-3 text-left text-xs font-medium text-muted-foreground" {...p} />
const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-3 py-2.5 align-top', className)} {...p} />

export default function Admin({ st, reload, show }: { st: State; reload: () => Promise<void>; show: 'routing' | 'team' | 'audit' }) {
  const toast = useToast()
  const [sim, setSim] = useState<Sim | null>(null)
  const [audit, setAudit] = useState<Audit[]>([])
  const [dep, setDep] = useState('ana')
  const [hand, setHand] = useState<{ rep: string; peer: string; accounts: string[]; meetings: number; id: string } | null>(null)
  const refresh = async () => { await reload(); const [s, a] = await Promise.all([api.simulate(), api.audit()]); setSim(s); setAudit(a) }
  useEffect(() => { refresh() }, []) // eslint-disable-line
  const R = st.rules
  const flip = useFlip(R.map(r => r.k).join())
  const [pend, setPend] = useState<string | null>(null)
  const run = async (k: string, f: () => Promise<unknown>) => { setPend(k); try { await f() } finally { setPend(null) } }
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => { if (audit.length) seen.current = new Set(audit.map((a, i) => a.t + a.ev + (audit.length - i))) }, [audit])
  async function save(rules: typeof R, msg: string) { await api.rules(rules); toast(msg); refresh() }
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= R.length) return; const n = R.slice(); [n[i], n[j]] = [n[j], n[i]]; save(n, 'Rule order saved') }
  const active = st.reps.filter(r => r.active)
  const [ownerDomains, setOwnerDomains] = useState<string[]>([])
  useEffect(() => { api.bookings().then(bs => setOwnerDomains([...new Set(bs.filter(b => b.why === 'owner').map(b => b.who.split('@')[1]))])) }, [st])

  return <div className="space-y-4">
    {show === 'routing' && sim && <Headline eyebrow="Routing quality" title={<>Right rep, first time: <Big>{sim.good}/{sim.total}</Big>, up from {sim.oldGood}/{sim.total}.</>} sub="Last week's bookings replayed through these rules. Change a rule below and watch this number move.">
      <div className="space-y-3">{([['Round robin (before)', sim.oldGood, 'bg-white/30'], ['Smart routing (now)', sim.good, 'bg-primary']] as const).map(([l, v, c]) => <div key={l}>
        <div className="mb-1 flex justify-between text-[12px] text-white/70"><span>{l}</span><span className="tabular-nums">{v}/{sim.total}</span></div>
        <div className="flex gap-1">{Array.from({ length: sim.total }, (_, i) => <div key={i} className={cn('h-7 flex-1 rounded-md transition-colors duration-slow', i < v ? c : 'bg-white/[.07]')} style={{ transitionDelay: i * 40 + 'ms' }} />)}</div></div>)}</div>
    </Headline>}
    {show === 'team' && (() => { const live = st.reps.filter(r => r.active), off = st.reps.filter(r => !r.active), away = live.filter(r => r.away)
      const owned = new Set(live.flatMap(r => r.owns))
      const orphan = new Set([...st.reps.flatMap(r => r.owns), ...ownerDomains].filter(d => !owned.has(d))).size
      return <Headline eyebrow="Team health" title={<><Big>{live.length - away.length} of {live.length}</Big> reps are taking meetings. <Big>{orphan}</Big> accounts without an owner.</>} sub={off.length ? `${off.map(r => r.name).join(', ')} left via Okta. Their accounts and meetings were handed over automatically.` : 'Okta keeps this list in sync. When someone leaves, their accounts and meetings move to a teammate automatically.'}>
        <div className="grid grid-cols-2 gap-2">{['NA-West', 'NA-East', 'EMEA', 'APAC'].map(t => { const reps = st.reps.filter(r => r.terr === t)
          return <div key={t} className="rounded-xl bg-white/[.06] p-3"><p className="text-[12px] text-white/60">{t}</p>
            <div className="mt-2 flex gap-1.5">{reps.map(r => <span key={r.id} title={`${r.name}: ${!r.active ? 'deprovisioned' : r.away ? 'on leave' : 'available'}`} className={cn('size-3 rounded-full transition-colors duration-slow', !r.active ? 'bg-red-400/70' : r.away ? 'bg-amber-400' : 'bg-emerald-400')} />)}</div></div> })}
          <p className="col-span-2 flex gap-3 text-[11px] text-white/50"><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" />available</span><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />on leave</span><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-400/70" />left</span></p></div>
      </Headline> })()}
    {show === 'routing' && <>
    {/* buffer time */}
    <BufferCard st={st} busy={pend === 'buf'} onSave={(on, before, after, msg) => run('buf', async () => { await api.buffer(on, before, after); toast(msg); await refresh() })} />

    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Routing rules</CardTitle><CardDescription>Rules run top to bottom. The first rule that finds an available rep wins, and round robin only breaks ties.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {R.map((r, i) => <div key={r.k} ref={flip(r.k)} className={cn('relative flex items-center gap-3 border-b bg-card py-3 transition-opacity duration-base ease-out', !r.on && 'opacity-45')}>
            <span className="w-6 text-[11px] tabular-nums text-muted-foreground">0{i + 1}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.t}</p><p className="text-xs text-muted-foreground">{r.d}</p></div>
            <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></Button>
            <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === R.length - 1}><ArrowDown /></Button>
            <button role="switch" aria-checked={r.on} aria-label={`Toggle ${r.k}`} onClick={() => save(R.map((x, k) => k === i ? { ...x, on: !x.on } : x), r.on ? 'Rule turned off' : 'Rule turned on')}
              className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-base ease-out active:[&>span]:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', r.on ? 'bg-primary' : 'bg-gray-300')}>
              <span className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-[transform,width] duration-base ease-out', r.on ? 'translate-x-4' : 'translate-x-0')} /></button>
          </div>)}
          <p className="px-1 pt-1 text-xs text-muted-foreground">Fallback: round robin within whatever group is left</p>
        </CardContent></Card>

      <Card className="min-h-[420px]"><CardHeader><CardTitle>Simulator</CardTitle><CardDescription>Last week's 8 bookings, re-routed with these rules.</CardDescription></CardHeader>
        <CardContent>{!sim ? <Skeleton className="h-72" /> : <>
          <div className="mb-4 grid grid-cols-3 divide-x divide-border border-y border-border">
            <div className="px-3 py-3"><p className="text-xs font-medium text-muted-foreground">Old round robin</p><p className="text-2xl font-semibold tabular-nums text-muted-foreground line-through decoration-1"><Count v={sim.oldGood} />/{sim.total}</p></div>
            <div className="px-3 py-3"><p className="text-xs font-medium text-blue-700">Smart routing</p><p className="text-2xl font-semibold tabular-nums text-foreground"><Count v={sim.good} />/{sim.total}</p></div>
            <div className="px-3 py-3"><p className="text-xs font-medium text-muted-foreground">Fixes saved</p><p className="text-2xl font-semibold tabular-nums"><Count v={sim.good - sim.oldGood} /></p></div></div>
          <table className="w-full text-[13px]"><thead className="border-b border-border"><tr><Th>Invitee</Th><Th>Old</Th><Th>Smart</Th></tr></thead>
            <tbody className="divide-y">{sim.rows.map(x => <tr key={x.inv.email} className="transition-colors hover:bg-muted/50"><Td><p>{x.inv.email}</p><p className="text-xs text-muted-foreground">{x.inv.loc} · {x.inv.topic}</p></Td>
              <Td><Badge variant={x.oldFit ? 'success' : 'destructive'}>{x.old}</Badge></Td><Td><Badge variant={x.neuFit ? 'success' : 'destructive'}>{x.neu}</Badge></Td></tr>)}</tbody></table></>}
        </CardContent></Card>
    </div>
    </>}

    {show === 'team' && <>
    <Card id="team" className="scroll-mt-6"><CardHeader><CardTitle>Team</CardTitle></CardHeader><CardContent className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]"><thead className="border-b border-border"><tr><Th>Rep</Th><Th>Territory</Th><Th>Skills</Th><Th>Languages</Th><Th>Owns</Th><Th>Status</Th></tr></thead>
        <tbody className="divide-y">{st.reps.map(r => <tr key={r.id} className={cn('transition-all hover:bg-muted/50', !r.active && 'opacity-50')}>
          <Td className="font-medium">{r.name}<p className="text-xs font-normal text-muted-foreground">{city(r.tz)}</p></Td><Td>{r.terr}</Td><Td>{r.skills.join(', ')}</Td><Td>{r.langs.join(', ')}</Td><Td>{r.owns.join(', ') || '–'}</Td>
          <Td>{!r.active ? <Badge variant="destructive">Deprovisioned</Badge> : <Button variant="outline" size="sm" className="w-[84px]" disabled={pend === r.id} aria-busy={pend === r.id} onClick={() => run(r.id, async () => { await api.leave(r.id, !r.away); toast(`${r.name} ${r.away ? 'is back' : 'is on leave'}`); await refresh() })}>{r.away ? 'On leave' : 'Available'}</Button>}</Td></tr>)}</tbody></table>
    </CardContent></Card>

    <div className="grid items-start gap-4">
      <Card><CardHeader><CardTitle className="flex flex-wrap items-baseline gap-3">Identity &amp; SCIM <Badge variant="success">Okta connected</Badge></CardTitle>
        <CardDescription>When IT deprovisions someone in Okta, Kestrel removes them from routing and hands their accounts and meetings to a teammate in the same territory. Every step is logged.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2"><NativeSelect className="max-w-[220px]" value={dep} onChange={e => setDep(e.target.value)}>{active.map(r => <option key={r.id} value={r.id}>{r.name} ({r.terr})</option>)}</NativeSelect>
            <Button variant="destructive" disabled={pend === 'scim'} aria-busy={pend === 'scim'} onClick={() => run('scim', async () => { const id = dep; const h = (await api.scimDeactivate(id))['urn:kestrel:handover']; setHand({ ...h, id }); toast('SCIM: user deprovisioned and work handed over'); await refresh(); const nx = st.reps.find(r => r.active && r.id !== id); if (nx) setDep(nx.id) })}><UserX />Simulate Okta deprovision</Button></div>
          {hand && <Alert key={hand.id} variant="success" className="animate-fade-up"><p>Okta sent <code className="text-[11.5px]">PATCH /scim/v2/Users/{hand.id} {'{active:false}'}</code></p>
            <ul className="mt-1 list-disc pl-5"><li>{hand.rep ?? 'This rep'} {hand.rep ? 'removed from routing' : 'was already deprovisioned'}</li><li>{(hand.accounts ?? []).length ? `${(hand.accounts ?? []).join(', ')} → ${hand.peer}` : 'No named accounts to move'}</li><li>{hand.meetings ?? 0} upcoming meetings → {hand.peer}, with one email to each invitee</li></ul></Alert>}
        </CardContent></Card>

    </div>
    </>}
    {show === 'audit' && <AuditPage audit={audit} />}
  </div>
}

const ACTORS = [['all', 'All'], ['ops', 'People'], ['okta-scim', 'Okta / SCIM'], ['booking-page', 'Bookings'], ['kestrel', 'System']] as const
const SRC: Record<string, { label: string; tone: string; bar: string }> = {
  ops: { label: 'People', tone: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  'okta-scim': { label: 'Okta / SCIM', tone: 'bg-[#6d4aff]/10 text-[#6d4aff] dark:text-[#a996ff]', bar: 'bg-[#6d4aff]' },
  'booking-page': { label: 'Bookings', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  kestrel: { label: 'System', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
}
const srcOf = (w: string) => (w.includes('@') ? 'ops' : SRC[w] ? w : 'kestrel')
const ICON: [RegExp, typeof Download][] = [[/booked/i, CalendarPlus], [/cancel/i, CalendarX], [/deprovision/i, UserX], [/provision/i, UserPlus], [/rule|routing/i, GitBranch], [/reassign/i, ArrowRightLeft], [/leave/i, Plane], [/buffer/i, Timer], [/skill/i, Wrench], [/fallback/i, ShieldCheck]]
const iconOf = (ev: string) => (ICON.find(([r]) => r.test(ev)) || [null, Activity])[1]
const initialsOf = (w: string) => w.includes('@') ? w.split('@')[0].slice(0, 2).toUpperCase() : w === 'okta-scim' ? 'OK' : w === 'booking-page' ? 'BP' : 'KS'

function AuditPage({ audit }: { audit: Audit[] }) {
  const [f, setF] = useState<(typeof ACTORS)[number][0]>('all')
  const [q, setQ] = useState('')
  const now = DateTime.now()
  const match = (a: Audit) => (f === 'all' || srcOf(a.who) === f) && (a.ev + a.d + a.who).toLowerCase().includes(q.toLowerCase())
  const rows = audit.filter(match)
  const groups = rows.reduce<Record<string, Audit[]>>((g, a) => { const d = DateTime.fromISO(a.t), k = d.hasSame(now, 'day') ? 'Today' : d.hasSame(now.minus({ days: 1 }), 'day') ? 'Yesterday' : d.toFormat('cccc d LLL'); (g[k] ||= []).push(a); return g }, {})
  const days = Array.from({ length: 14 }, (_, i) => now.minus({ days: 13 - i }).startOf('day'))
  const perDay = days.map(d => Object.keys(SRC).map(k => audit.filter(a => srcOf(a.who) === k && DateTime.fromISO(a.t).hasSame(d, 'day')).length))
  const maxDay = Math.max(1, ...perDay.map(x => x.reduce((a, b) => a + b, 0)))
  const counts = Object.keys(SRC).map(k => audit.filter(a => srcOf(a.who) === k).length)
  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <div className="grid grid-cols-2 gap-3">{Object.entries(SRC).map(([k, v], i) => <button key={k} onClick={() => setF(f === k ? 'all' : k as typeof f)}
        className={cn('rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--card))] p-4 text-left transition-all duration-base hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-fade-up', f === k && 'ring-2 ring-primary')} style={{ animationDelay: i * 40 + 'ms' }}>
        <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium', v.tone)}>{v.label}</span>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{counts[i]}</p><p className="text-xs text-muted-foreground">events · 14 days</p></button>)}</div>
      <Card className="p-5"><div className="flex items-baseline justify-between"><h3 className="font-semibold">Activity</h3><span className="text-xs text-muted-foreground">Last 14 days</span></div>
        <div className="mt-4 flex h-32 items-end gap-1.5">{perDay.map((seg, i) => { const tot = seg.reduce((a, b) => a + b, 0)
          return <div key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${days[i].toFormat('d LLL')} · ${tot} events`}>
            <div className="flex flex-col-reverse overflow-hidden rounded-[4px] transition-opacity group-hover:opacity-80" style={{ height: tot ? `${(tot / maxDay) * 100}%` : '3px', animation: `grow .5s ${i * 30}ms cubic-bezier(.2,.8,.2,1) both`, transformOrigin: 'bottom' }}>
              {tot ? Object.values(SRC).map((v, k) => seg[k] ? <div key={k} className={v.bar} style={{ height: `${(seg[k] / tot) * 100}%` }} /> : null) : <div className="h-full bg-[hsl(var(--muted))]" />}</div></div> })}</div>
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground"><span>{days[0].toFormat('d LLL')}</span><span>Today</span></div></Card>
    </div>

    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <div className="flex flex-wrap gap-1 rounded-full bg-[hsl(var(--muted))] p-1 text-[13px]">{ACTORS.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={cn('rounded-full px-3 py-1 font-medium transition-all duration-fast', f === k ? 'bg-[hsl(var(--card))] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{l}</button>)}</div>
        <input aria-label="Search audit log" placeholder="Search events" value={q} onChange={e => setQ(e.target.value)} className="ml-auto h-9 w-full rounded-full border border-input bg-white px-4 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-56" />
        <Button variant="outline" size="sm" onClick={() => { location.href = apiUrl('/api/audit.csv') }}><Download />Export CSV</Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <div className="py-14 text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-[hsl(var(--muted))]"><Activity className="size-4 text-muted-foreground" /></div><p className="mt-3 font-medium">No events match</p><p className="mt-1 text-[13px] text-muted-foreground">Try a different filter or search term.</p></div> :
          Object.entries(groups).map(([day, items]) => <div key={day} className="mb-5 last:mb-0">
            <div className="sticky top-0 z-10 mb-2 flex items-center gap-3 bg-[hsl(var(--card))] py-1"><p className="text-xs font-semibold">{day}</p><div className="h-px flex-1 bg-[hsl(var(--line))]" /><span className="text-[11px] tabular-nums text-muted-foreground">{items.length}</span></div>
            <ol className="space-y-1">{items.map((a, i) => { const k = srcOf(a.who), I = iconOf(a.ev)
              return <li key={a.t + i} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[hsl(var(--muted)/.6)] animate-fade-up" style={{ animationDelay: i * 30 + 'ms' }}>
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', SRC[k].tone)}><I className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-[13px] font-medium">{a.ev}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--line))] py-0.5 pl-0.5 pr-2 text-[11px] text-muted-foreground"><span className="grid size-4 place-items-center rounded-full bg-[hsl(var(--muted))] text-[8px] font-semibold text-foreground">{initialsOf(a.who)}</span>{a.who}</span></div>
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground group-hover:whitespace-normal">{a.d}</p></div>
                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground" title={DateTime.fromISO(a.t).toFormat('d LLL yyyy, HH:mm')}>{DateTime.fromISO(a.t).toRelative({ style: 'short' })}</span>
              </li> })}</ol></div>)}
      </CardContent></Card>
  </div>
}

const BEFORE = [0, 5, 10, 15], AFTER = [0, 5, 10, 15, 30]
function Seg({ value, opts, onChange, label }: { value: number; opts: number[]; onChange: (v: number) => void; label: string }) {
  return <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-[hsl(var(--muted))] p-1 text-[13px]">{opts.map(o => <button key={o} role="radio" aria-checked={value === o} onClick={() => onChange(o)}
      className={cn('min-w-[46px] rounded-full px-2.5 py-1 font-medium tabular-nums transition-all duration-fast', value === o ? 'bg-[hsl(var(--card))] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{o ? `${o}m` : 'None'}</button>)}</div></div>
}
function BufferCard({ st, busy, onSave }: { st: State; busy: boolean; onSave: (on: boolean, before: number, after: number, msg: string) => void }) {
  const [before, setBefore] = useState(st.bufferBefore || 5), [after, setAfter] = useState(st.bufferAfter || 10)
  const dirty = st.buffer && (before !== st.bufferBefore || after !== st.bufferAfter)
  const total = before + 30 + after, pct = (m: number) => `${(m / total) * 100}%`
  return <Card><CardContent className="space-y-4 p-5">
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-[240px] flex-1">
        <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium', st.buffer ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary')}>{st.buffer ? 'On for all reps' : 'Suggestion'}</span>
        <p className="mt-2 font-semibold">{st.buffer ? 'Buffer time protects every meeting.' : 'Your reps had 23 back-to-back meetings last week.'}</p>
        <p className="text-sm text-muted-foreground">{st.buffer ? `${st.bufferBefore} min to prepare before and ${st.bufferAfter} min to write notes or travel after. Customers can't book into these gaps.` : 'Buffer time already existed but was hidden under Advanced settings. 31 accounts asked for it; only 5 had found it.'}</p>
      </div>
      {st.buffer ? <div className="flex gap-2">
          {dirty && <Button disabled={busy} aria-busy={busy} onClick={() => onSave(true, before, after, `Buffers updated: ${before}m before, ${after}m after`)}>Save changes</Button>}
          <Button variant="outline" disabled={busy} onClick={() => onSave(false, before, after, 'Buffers turned off')}>Turn off</Button></div>
        : <Button disabled={busy} aria-busy={busy} onClick={() => onSave(true, before, after, `Buffers on: ${before}m before, ${after}m after`)}>Turn on for everyone</Button>}
    </div>
    <div className="grid items-end gap-5 border-t border-[hsl(var(--line))] pt-4 md:grid-cols-[auto_auto_1fr]">
      <Seg label="Before (prep)" value={before} opts={BEFORE} onChange={setBefore} />
      <Seg label="After (notes / travel)" value={after} opts={AFTER} onChange={setAfter} />
      <div aria-label="Preview of one meeting with buffers"><p className="mb-1.5 text-xs font-medium text-muted-foreground">Preview: one 30-min meeting blocks {total} min</p>
        <div className="flex h-9 overflow-hidden rounded-lg text-[11px] font-medium">
          {before > 0 && <div className="grid place-items-center bg-[repeating-linear-gradient(135deg,hsl(var(--primary)/.18)_0_6px,transparent_6px_12px)] text-primary transition-all duration-base" style={{ width: pct(before) }}>{before}m</div>}
          <div className="grid place-items-center bg-primary text-white transition-all duration-base" style={{ width: pct(30) }}>Meeting</div>
          {after > 0 && <div className="grid place-items-center bg-[repeating-linear-gradient(135deg,hsl(var(--primary)/.18)_0_6px,transparent_6px_12px)] text-primary transition-all duration-base" style={{ width: pct(after) }}>{after}m</div>}
        </div></div>
    </div>
  </CardContent></Card>
}
