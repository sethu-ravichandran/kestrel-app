import { useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Globe, Info, Video } from 'lucide-react'
import { api, city, type Invitee, type RouteRes, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label, NativeSelect, Skeleton } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const PRESETS = [
  { label: 'Existing customer (Bluecrest)', email: 'j.moreno@bluecrest.com', loc: 0, topic: 'general', lang: 'English', away: false },
  { label: 'New lead from Seattle', email: 'sam.k@gmail.com', loc: 0, topic: 'general', lang: 'English', away: false },
  { label: 'Technical call, Madrid, Spanish', email: 'it@ferrovia.es', loc: 5, topic: 'technical', lang: 'Spanish', away: false },
  { label: 'Account owner on leave', email: 'cfo@northfold.de', loc: 6, topic: 'billing', lang: 'German', away: true },
]
const TOPIC: Record<string, string> = { general: 'Intro & pricing', technical: 'Technical deep-dive', billing: 'Billing question' }
const initials = (n: string) => n.split(' ').map(x => x[0]).join('')
const first = (n: string) => n.split(' ')[0]
const Logo = () => <div className="flex items-center gap-2"><div className="grid size-8 place-items-center rounded-md bg-gray-900 text-[13px] font-bold text-white">H</div><span className="font-semibold">Halden Group</span></div>

export default function Book({ st, reload }: { st: State; reload: () => void }) {
  const toast = useToast()
  const [stage, setStage] = useState<'intake' | 'pick' | 'done'>('intake')
  const [f, setF] = useState({ email: PRESETS[0].email, loc: 0, topic: 'general', lang: 'English' })
  const [res, setRes] = useState<RouteRes | null>(null)
  const [why, setWhy] = useState(false)
  const [day, setDay] = useState<string | null>(null)
  const [month, setMonth] = useState(DateTime.fromISO(st.now).startOf('month'))
  const [sel, setSel] = useState<string | null>(null)
  const [h12, setH12] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ id: string; start: string; buffer: boolean } | null>(null)
  const [err, setErr] = useState('')
  const [demo, setDemo] = useState(false)
  const [dir, setDir] = useState(0)
  const shiftMonth = (d: number) => { setDir(d); setMonth(month.plus({ months: d })) }
  const L = st.locs[f.loc]
  const inv: Invitee = { email: f.email, loc: L[0], tz: L[1], terr: L[2], topic: f.topic, lang: f.lang }
  const rep = res?.rep
  const tf = h12 ? 'h:mma' : 'HH:mm'

  const byDay = useMemo(() => { const m: Record<string, string[]> = {}; (res?.slots || []).forEach(s => { const k = DateTime.fromISO(s).setZone(inv.tz).toISODate()!; (m[k] ||= []).push(s) }); return m }, [res, inv.tz])

  async function go(i = inv) {
    setStage('pick'); setRes(null); setErr(''); setSel(null); setWhy(false)
    const [r] = await Promise.all([api.route(i), new Promise(ok => setTimeout(ok, 350))]) as [RouteRes, unknown]
    setRes(r); const firstDay = r.slots[0] ? DateTime.fromISO(r.slots[0]).setZone(i.tz) : null
    setDay(firstDay?.toISODate() ?? null); if (firstDay) setMonth(firstDay.startOf('month'))
  }
  async function preset(p: typeof PRESETS[number]) {
    setDemo(false); const nf = { email: p.email, loc: p.loc, topic: p.topic, lang: p.lang }; setF(nf)
    await api.leave('lena', p.away); reload(); const L2 = st.locs[p.loc]
    go({ email: p.email, loc: L2[0], tz: L2[1], terr: L2[2], topic: p.topic, lang: p.lang })
  }
  async function confirm() {
    if (!sel) return; setBusy(true); setErr('')
    try { const o = await api.book(inv, sel); setDone({ id: o.booking.id, start: o.booking.start, buffer: o.buffer }); setStage('done'); toast('Meeting booked') }
    catch (e) { setErr((e as Error).message); go() } finally { setBusy(false) }
  }
  useEffect(() => { setSel(null) }, [day])

  // calendar grid
  const start = month.startOf('week'), cells = Array.from({ length: 42 }, (_, i) => start.plus({ days: i }))
  const daySlots = day ? byDay[day] || [] : []

  const demoMenu = <div className="fixed bottom-4 left-4 z-40">
    {demo && <div className="mb-2 w-64 rounded-lg border bg-white p-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
      <p className="px-2 py-1.5 text-xs text-muted-foreground">Demo scenarios</p>
      {PRESETS.map(p => <button key={p.label} onClick={() => preset(p)} className="block h-9 w-full rounded-md px-2 text-left text-[13px] transition-colors duration-fast hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">{p.label}</button>)}
    </div>}
    <Button variant="outline" size="sm" className="shadow-sm" onClick={() => setDemo(!demo)}>Demo scenarios</Button>
  </div>

  if (stage === 'intake') return <>{demoMenu}
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6 shadow-sm animate-fade-up">
      <Logo />
      <h2 className="mt-5 text-lg font-semibold">Book a call</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">A few details so we can connect you with the right person.</p>
      <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); go() }}>
        <div className="space-y-1.5"><Label htmlFor="em">Work email</Label><Input id="em" type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="lo">Location</Label><NativeSelect id="lo" value={f.loc} onChange={e => setF({ ...f, loc: +e.target.value })}>{st.locs.map((l, i) => <option key={l[0]} value={i}>{l[0]}</option>)}</NativeSelect></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="to">Topic</Label><NativeSelect id="to" value={f.topic} onChange={e => setF({ ...f, topic: e.target.value })}>{Object.entries(TOPIC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="la">Language</Label><NativeSelect id="la" value={f.lang} onChange={e => setF({ ...f, lang: e.target.value })}>{['English', 'Spanish', 'French', 'German'].map(x => <option key={x}>{x}</option>)}</NativeSelect></div>
        </div>
        <Button type="submit" className="w-full">Continue</Button>
      </form>
    </div></>

  if (stage === 'done' && done && rep) { const s = DateTime.fromISO(done.start); return <>{demoMenu}
    <div className="mx-auto max-w-lg rounded-xl border bg-white p-8 text-center shadow-sm animate-fade-up">
      <div className="mx-auto grid size-11 place-items-center rounded-full bg-green-100 text-green-700 animate-pop"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" className="animate-draw" /></svg></div>
      <h2 className="mt-4 text-lg font-semibold">This meeting is scheduled</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">We sent a calendar invitation to {inv.email}.</p>
      <dl className="mt-6 divide-y border-y text-left text-[13px]">
        {[['What', `${TOPIC[inv.topic]} with Halden Group`], ['When', `${s.setZone(inv.tz).toFormat(`cccc d LLLL · ${tf}`)} (${city(inv.tz)} time)`], ['Who', `${rep.name}${res?.why === 'owner' ? ' · your account manager' : ''}`], ['Their time', `${s.setZone(rep.tz).toFormat(tf)} in ${city(rep.tz)}`], ['Where', 'Google Meet']].map(([k, v]) =>
          <div key={k} className="grid grid-cols-[90px_1fr] py-2.5"><dt className="font-medium">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>)}
      </dl>
      {done.buffer && <p className="mt-4 text-xs text-muted-foreground">A 10-minute buffer was added after this meeting on {first(rep.name)}'s calendar.</p>}
      <div className="mt-6 flex justify-center gap-2"><Button variant="outline" onClick={() => go()}>Book another time</Button><Button variant="outline" onClick={() => setStage('intake')}>Start over</Button></div>
    </div></> }

  return <>{demoMenu}
    <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border bg-white shadow-sm animate-fade-up">
      <div className="grid md:grid-cols-[280px_1fr_250px]">
        {/* left: who + what */}
        <aside className="border-b p-5 md:border-b-0 md:border-r">
          <button onClick={() => setStage('intake')} className="-ml-1.5 mb-3 inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-3.5" />Edit details</button>
          <Logo />
          {!rep ? <div className="mt-6"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-28" /></div></div><Skeleton className="mt-2 h-5 w-32 rounded-full" /><Skeleton className="mt-5 h-6 w-40" /><div className="mt-3 space-y-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-24" /></div></div> : <div className="animate-fade-up">
            <div className="mt-6 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-blue-600 text-[13px] font-semibold text-white">{initials(rep.name)}</div>
              <div><p className="text-[13px] text-muted-foreground">You'll meet</p><p className="font-semibold">{rep.name}</p></div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{res?.why === 'owner' ? <Badge variant="default">Your account manager</Badge> : <><Badge>{rep.terr}</Badge>{inv.topic === 'technical' && <Badge>Solutions engineer</Badge>}{rep.langs.includes(inv.lang) && inv.lang !== 'English' && <Badge>Speaks {inv.lang}</Badge>}</>}</div>
            <h2 className="mt-5 text-lg font-semibold">{TOPIC[inv.topic]}</h2>
            <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-2"><Clock className="size-4" />30 min</li>
              <li className="flex items-center gap-2"><Video className="size-4" />Google Meet</li>
              <li className="flex items-center gap-2"><Globe className="size-4" />{city(inv.tz)} time</li>
            </ul>
            <button onClick={() => setWhy(!why)} aria-expanded={why} className="-ml-1.5 mt-4 inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-blue-700 transition-colors duration-fast hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-3.5" />Why {first(rep.name)}?</button>
            {why && <ul className="mt-2 space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              {res!.trace.filter(s => s.s !== 'mut').map((s, i) => <li key={i} className="flex gap-1.5"><span className={cn('mt-1 size-1.5 shrink-0 rounded-full', s.s === 'ok' ? 'bg-green-600' : 'bg-amber-500')} /><span><span className="text-muted-foreground">{s.t.split('→')[0].trim()}:</span> {s.r}</span></li>)}
            </ul>}
          </div>}
        </aside>

        {/* middle: calendar */}
        <section className="border-b p-5 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between"><h3 className="font-semibold">{month.toFormat('LLLL yyyy')}</h3>
            <div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight /></Button></div></div>
          <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-medium uppercase text-muted-foreground">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-1">{d}</div>)}</div>
          <div key={month.toISODate()} className={cn('mt-1 grid grid-cols-7 gap-1', dir > 0 ? 'animate-slide-l' : dir < 0 ? 'animate-slide-r' : '')}>{cells.map(c => { const k = c.toISODate()!, has = !!byDay[k], inM = c.month === month.month, on = k === day
            return <button key={k} disabled={!has || !rep} onClick={() => setDay(k)} aria-pressed={on}
              className={cn('relative aspect-square min-h-9 rounded-md text-[13px] tabular-nums transition-[background-color,color,transform] duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 enabled:active:scale-[.94] disabled:cursor-default',
                !inM && 'invisible', on ? 'bg-gray-900 font-semibold text-white' : has && rep ? 'bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100' : 'text-gray-300')}>
              {c.day}{has && !on && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-blue-600" />}</button> })}</div>
        </section>

        {/* right: times */}
        <section className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">{day ? <>{DateTime.fromISO(day).toFormat('ccc')} <span className="text-muted-foreground">{DateTime.fromISO(day).toFormat('d')}</span></> : <CalendarDays className="size-4" />}</p>
            <div className="flex rounded-md border p-0.5 text-[11px]">{[false, true].map(v => <button key={String(v)} onClick={() => setH12(v)} aria-pressed={h12 === v} className={cn('rounded px-2 py-1 tabular-nums transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', h12 === v ? 'bg-gray-900 text-white' : 'text-muted-foreground hover:text-foreground')}>{v ? '12h' : '24h'}</button>)}</div>
          </div>
          <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {!res ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />) :
              daySlots.length === 0 ? <p className="text-[13px] text-muted-foreground">No times this day.</p> :
              daySlots.map((s, i) => { const d = DateTime.fromISO(s), on = sel === s
                return <div key={s} className="flex gap-2 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <button onClick={() => setSel(on ? null : s)} title={`${d.setZone(rep!.tz).toFormat(tf)} for ${first(rep!.name)} in ${city(rep!.tz)}`}
                    className={cn('h-10 flex-1 rounded-md border text-[13px] font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-fast ease-out hover:border-blue-600 hover:text-blue-700 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1', on && 'bg-gray-900 text-white border-gray-900 hover:border-gray-900 hover:text-white')}>
                    {d.setZone(inv.tz).toFormat(tf).toLowerCase()}</button>
                  {on && <Button className="h-10 animate-slide-l" disabled={busy} aria-busy={busy} onClick={confirm}>{busy && <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{busy ? 'Booking…' : 'Confirm'}</Button>}
                </div> })}
          </div>
          {sel && rep && <p className="mt-3 text-xs text-muted-foreground animate-fade-up">That's {DateTime.fromISO(sel).setZone(rep.tz).toFormat(tf).toLowerCase()} for {first(rep.name)} in {city(rep.tz)}.</p>}
          {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
        </section>
      </div>
    </div></>
}
