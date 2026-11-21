import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { Copy, Globe, Mail, Video, X } from 'lucide-react'
import { api, city, type Booking, type RouteRes, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { REP_COLOR } from './Team'
import { cn } from '@/lib/utils'

const TERR_OF: Record<string, string> = { 'America/Los_Angeles': 'NA-West', 'America/New_York': 'NA-East', 'America/Toronto': 'NA-East', 'Europe/Berlin': 'EMEA', 'Europe/Madrid': 'EMEA', 'Europe/London': 'EMEA', 'Asia/Singapore': 'APAC', 'Australia/Sydney': 'APAC' }
const TOPIC: Record<string, string> = { general: 'Intro & pricing', technical: 'Technical deep-dive', billing: 'Billing' }
const Row = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex justify-between gap-3 py-1.5 text-[13px]"><span className="text-muted-foreground">{k}</span><span className="text-right">{children}</span></div>
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="border-t border-[hsl(var(--line))] px-5 py-4"><h4 className="mb-2 text-[13px] font-semibold">{title}</h4>{children}</section>

export default function Inspector({ b, st, onClose, onCancel }: { b: Booking; st: State; onClose: () => void; onCancel: (b: Booking) => void }) {
  const toast = useToast()
  const [trace, setTrace] = useState<RouteRes | null>(null)
  const r = st.reps.find(x => x.id === b.repId), d = DateTime.fromISO(b.start)
  useEffect(() => { setTrace(null); api.route({ email: b.who, loc: '', tz: b.tz, terr: TERR_OF[b.tz] || '', topic: b.topic, lang: 'English' }).then(setTrace) }, [b.id]) // eslint-disable-line
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const hoursAway = Math.round(d.diff(DateTime.fromISO(st.now), 'hours').hours)
  return <aside aria-label="Booking details" className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--card))] shadow-[0_8px_30px_-12px_rgba(12,16,36,.18)] animate-in fade-in slide-in-from-right-4 duration-200">
    <div className="flex items-start justify-between gap-2 px-5 pb-3 pt-4">
      <div><p className="text-xs tabular-nums text-muted-foreground">{b.id}</p><h3 className="mt-0.5 font-semibold">{TOPIC[b.topic] || b.topic}</h3></div>
      <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X /></Button>
    </div>
    <div className="flex flex-wrap gap-1.5 px-5 pb-4"><Badge variant={b.status === 'confirmed' ? 'success' : 'destructive'}>{b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</Badge>{b.why === 'owner' ? <Badge variant="default">Account owner</Badge> : <Badge>Routed by rules</Badge>}</div>

    <Section title="Time">
      <div className="grid grid-cols-2 gap-2">{[[b.tz, 'Invitee'], [r?.tz || 'UTC', r ? r.name.split(' ')[0] : 'Rep']].map(([z, l]) => <div key={l} className="rounded-xl bg-[hsl(var(--muted))] p-3">
        <p className="text-[11px] text-muted-foreground">{l} · {city(z)}</p><p className="text-xl font-semibold tabular-nums tracking-tight">{d.setZone(z).toFormat('HH:mm')}</p><p className="text-[11px] text-muted-foreground">{d.setZone(z).toFormat('ccc d LLL')}</p></div>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">{hoursAway > 0 ? `Starts in ${hoursAway < 48 ? hoursAway + ' hours' : Math.round(hoursAway / 24) + ' days'}` : 'In the past'} · 30 min</p>
    </Section>

    <Section title="People">
      <Row k="Invitee"><span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" />{b.who}</span></Row>
      {r && <Row k="Rep"><span className="inline-flex items-center gap-2"><span className={cn('grid size-5 place-items-center rounded-full text-[9px] font-semibold', REP_COLOR[r.id])}>{r.name.split(' ').map(x => x[0]).join('')}</span>{r.name}</span></Row>}
      {r && <Row k="Territory">{r.terr}</Row>}
      <Row k="Location"><span className="inline-flex items-center gap-1.5"><Video className="size-3.5 text-muted-foreground" />Google Meet</span></Row>
      <Row k="Invitee zone"><span className="inline-flex items-center gap-1.5"><Globe className="size-3.5 text-muted-foreground" />{b.tz}</span></Row>
    </Section>

    <Section title="Why this rep">
      {!trace ? <div className="space-y-2"><Skeleton className="h-4" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></div> :
        <ol className="space-y-2">{trace.trace.map((s, i) => <li key={i} className="flex gap-2 text-[12.5px] animate-fade-up" style={{ animationDelay: i * 50 + 'ms' }}>
          <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', s.s === 'ok' ? 'bg-emerald-500' : s.s === 'warn' ? 'bg-amber-500' : 'bg-[hsl(var(--muted-foreground)/.4)]')} />
          <span><span className="text-muted-foreground">{s.t}</span><br />{s.r}</span></li>)}</ol>}
      <p className="mt-2 text-[11px] text-muted-foreground">Re-evaluated against the current rules.</p>
    </Section>

    {b.status === 'confirmed' && <div className="flex gap-2 border-t border-[hsl(var(--line))] p-4">
      <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard?.writeText(`https://meet.google.com/kes-${b.id.toLowerCase()}`).catch(() => {}); toast('Meeting link copied') }}><Copy />Copy link</Button>
      <Button variant="outline" className="flex-1 text-red-600 hover:bg-red-50" onClick={() => onCancel(b)}>Cancel</Button>
    </div>}
  </aside>
}
