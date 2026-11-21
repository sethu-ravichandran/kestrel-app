import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { ArrowRight, CalendarCheck, ChevronRight, Clock, Globe2, Sparkles } from 'lucide-react'
import { api, city, type Invitee, type RouteRes, type State } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label, NativeSelect, Skeleton } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const PRESETS = [
  { label: 'Existing customer', email: 'j.moreno@bluecrest.com', loc: 0, topic: 'general', lang: 'English', away: false },
  { label: 'New lead, Seattle', email: 'sam.k@gmail.com', loc: 0, topic: 'general', lang: 'English', away: false },
  { label: 'Technical · Madrid · Spanish', email: 'it@ferrovia.es', loc: 5, topic: 'technical', lang: 'Spanish', away: false },
  { label: 'Owner on leave', email: 'cfo@northfold.de', loc: 6, topic: 'billing', lang: 'German', away: true },
]
const initials = (n: string) => n.split(' ').map(x => x[0]).join('')
const first = (n: string) => n.split(' ')[0]

export default function Book({ st, reload }: { st: State; reload: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ email: PRESETS[0].email, loc: 0, topic: 'general', lang: 'English' })
  const [res, setRes] = useState<RouteRes | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<string | null>(null)
  const [done, setDone] = useState<{ id: string; start: string; rep: RouteRes['rep']; buffer: boolean; why: string } | null>(null)
  const [err, setErr] = useState('')
  const L = st.locs[f.loc]
  const inv: Invitee = { email: f.email, loc: L[0], tz: L[1], terr: L[2], topic: f.topic, lang: f.lang }

  async function run(i = inv) {
    setLoading(true); setDone(null); setErr('')
    const [r] = await Promise.all([api.route(i), new Promise(ok => setTimeout(ok, 300))])
    setRes(r as RouteRes); setLoading(false)
  }
  useEffect(() => { run() }, []) // eslint-disable-line
  async function preset(p: typeof PRESETS[number]) {
    const nf = { email: p.email, loc: p.loc, topic: p.topic, lang: p.lang }; setF(nf)
    await api.leave('lena', p.away); reload()
    const L2 = st.locs[p.loc]; run({ email: p.email, loc: L2[0], tz: L2[1], terr: L2[2], topic: p.topic, lang: p.lang })
  }
  async function book(s: string) {
    setBooking(s); setErr('')
    try { const o = await api.book(inv, s); setDone({ id: o.booking.id, start: o.booking.start, rep: o.rep, buffer: o.buffer, why: res!.why }); toast('Booked. Confirmation email sent.'); const r = await api.route(inv); setRes(r) }
    catch (e) { setErr((e as Error).message) } finally { setBooking(null) }
  }
  const rep = res?.rep

  return <div className="grid gap-4 md:grid-cols-[320px_1fr] items-start">
    <Card>
      <CardHeader><CardTitle>Talk to Halden Group</CardTitle><CardDescription>Tell us a little about you and we'll find the right person.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label htmlFor="em">Work email</Label><Input id="em" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="lo">Where are you based?</Label><NativeSelect id="lo" value={f.loc} onChange={e => setF({ ...f, loc: +e.target.value })}>{st.locs.map((l, i) => <option key={l[0]} value={i}>{l[0]}</option>)}</NativeSelect></div>
        <div className="space-y-2"><Label htmlFor="to">What's this about?</Label><NativeSelect id="to" value={f.topic} onChange={e => setF({ ...f, topic: e.target.value })}><option value="general">General / pricing</option><option value="technical">Technical / integration</option><option value="billing">Billing</option></NativeSelect></div>
        <div className="space-y-2"><Label htmlFor="la">Preferred language</Label><NativeSelect id="la" value={f.lang} onChange={e => setF({ ...f, lang: e.target.value })}>{['English', 'Spanish', 'French', 'German'].map(x => <option key={x}>{x}</option>)}</NativeSelect></div>
        <Button className="w-full" onClick={() => run()}>Find my person <ArrowRight /></Button>
        <div className="border-t pt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Try a scenario</p>
          <div className="flex flex-wrap gap-1.5">{PRESETS.map(p => <Button key={p.label} variant="outline" size="sm" onClick={() => preset(p)}>{p.label}</Button>)}</div></div>
      </CardContent>
    </Card>

    <div className="space-y-4">
      <Card className="min-h-[460px]">
        <CardContent className="p-5">
          {loading || !res ? <div className="space-y-4" aria-busy="true">
            <div className="flex items-center gap-3"><Skeleton className="size-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-3.5 w-3/4" /></div></div>
            <Skeleton className="h-36" /><div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[62px]" />)}</div>
          </div> : !rep ? <Alert variant="destructive">No one is available right now.</Alert> : <div className="animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-semibold text-primary animate-in zoom-in-90 duration-300">{initials(rep.name)}</div>
              <div><h2 className="text-lg font-semibold tracking-tight">You'll meet {rep.name}</h2>
                <p className="text-xs text-muted-foreground">{rep.terr} · {city(rep.tz)} · {rep.skills.join(', ')} · speaks {rep.langs.join(', ')}</p></div>
              {res.why === 'owner' && <Badge variant="success" className="ml-auto">Your account owner</Badge>}
            </div>
            <div className="mt-4 rounded-lg border bg-zinc-50/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="size-3.5 text-primary" />Why {first(rep.name)}?</p>
              <ol className="space-y-1.5">{res.trace.map((s, i) => <li key={i} style={{ animationDelay: `${i * 70}ms` }} className="flex flex-wrap items-center gap-2 text-[13px] animate-fade-up">
                <ChevronRight className="size-3.5 text-muted-foreground" /><span className="min-w-[230px] flex-1">{s.t}</span>
                <Badge variant={s.s === 'ok' ? 'success' : s.s === 'warn' ? 'warning' : 'outline'}>{s.r}</Badge></li>)}</ol>
            </div>
            <h3 className="mt-5 flex items-center gap-1.5 text-sm font-semibold"><Clock className="size-4" />Pick a time <span className="font-normal text-muted-foreground">: only times inside both your day and {first(rep.name)}'s{st.buffer ? ', with a 10-min buffer' : ''}</span></h3>
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2">
              {res.slots.map((s, i) => { const d = DateTime.fromISO(s); return <button key={s} disabled={!!booking} onClick={() => book(s)} style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                className={cn('group min-h-[62px] rounded-lg border bg-background px-3 py-2.5 text-left transition-all duration-150 hover:-translate-y-px hover:border-primary hover:shadow-md active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-fade-up disabled:opacity-60', booking === s && 'border-primary ring-2 ring-primary/30')}>
                <div className="text-sm font-semibold tabular-nums">{d.setZone(inv.tz).toFormat('ccc d LLL · HH:mm')} <span className="text-xs font-normal text-muted-foreground">your time</span></div>
                <div className="text-xs text-muted-foreground tabular-nums">{d.setZone(rep.tz).toFormat('HH:mm')} for {first(rep.name)} ({city(rep.tz)})</div></button> })}
            </div>
            {err && <Alert variant="destructive" className="mt-3">{err}</Alert>}
          </div>}
        </CardContent>
      </Card>

      {done && done.rep && <Card className="border-success/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-success"><CalendarCheck className="size-5" />Booked with {done.rep.name}</CardTitle><CardDescription>Booking {done.id} saved on the server.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">{[[inv.tz, 'You'], [done.rep.tz, done.rep.name.split(' ')[0]], ['UTC', 'Stored (UTC)']].map(([z, l]) => { const d = DateTime.fromISO(done.start).setZone(z); return <div key={l} className="rounded-lg bg-muted p-3 animate-in zoom-in-95"><p className="text-xs text-muted-foreground">{l} · {z === 'UTC' ? 'UTC' : city(z)}</p><p className="text-xl font-semibold tabular-nums tracking-tight">{d.toFormat('HH:mm')}</p><p className="text-xs text-muted-foreground">{d.toFormat('ccc d LLL')}</p></div> })}</div>
          {done.buffer && <Alert variant="success">10-min buffer blocked after this meeting on {first(done.rep.name)}'s calendar.</Alert>}
          <div className="rounded-lg border bg-zinc-50/60 p-4 text-[13px] leading-relaxed">
            <p><b>Subject:</b> Halden Group · {DateTime.fromISO(done.start).setZone(inv.tz).toFormat('ccc d LLL, HH:mm')} your time ({city(inv.tz)})</p>
            <p className="mt-2">Hi, you're meeting <b>{done.rep.name}</b>{done.why === 'owner' ? ', your account manager' : `, our ${inv.topic === 'technical' ? 'solutions engineer' : 'specialist'} for ${inv.terr}`}.</p>
            <p className="flex items-center gap-1.5"><Globe2 className="size-3.5" /><b>{DateTime.fromISO(done.start).setZone(inv.tz).toFormat('cccc d LLLL, HH:mm')} {city(inv.tz)} time</b> = {DateTime.fromISO(done.start).setZone(done.rep.tz).toFormat('HH:mm')} {city(done.rep.tz)}</p>
          </div>
        </CardContent>
      </Card>}
    </div>
  </div>
}
