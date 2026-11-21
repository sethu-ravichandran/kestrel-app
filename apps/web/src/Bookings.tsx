import { useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { Search, X } from 'lucide-react'
import { api, city, type Booking, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Skeleton } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { TerritoryCards, WeekGrid } from './Team'
import Inspector from './Inspector'
import { Big, Headline } from '@/components/Headline'

const TOPIC: Record<string, string> = { general: 'Intro & pricing', technical: 'Technical deep-dive', billing: 'Billing' }

export default function Bookings({ st }: { st: State }) {
  const toast = useToast()
  const [rows, setRows] = useState<Booking[] | null>(null)
  const [tab, setTab] = useState<'confirmed' | 'cancelled'>('confirmed')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'list' | 'week'>('list')
  const [open, setOpen] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const load = async () => setRows(await api.bookings())
  useEffect(() => { load() }, [])
  const rep = (id: string) => st.reps.find(r => r.id === id)

  const list = useMemo(() => (rows || []).filter(b => b.status === tab && (b.who + (rep(b.repId)?.name || '')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.start.localeCompare(b.start)), [rows, tab, q, st]) // eslint-disable-line
  const live = (rows || []).filter(b => b.status === 'confirmed')
  const stats = [
    ['Upcoming meetings', String(live.length)],
    ['Routed to account owner', live.length ? Math.round(100 * live.filter(b => b.why === 'owner').length / live.length) + '%' : '–'],
    ['Routed by rules', String(live.filter(b => b.why === 'rules').length)],
    ['Active reps', String(st.reps.filter(r => r.active && !r.away).length) + ' / ' + st.reps.length],
  ]

  async function cancel(b: Booking) {
    setPending(b.id); await api.cancel(b.id); setOpen(null); toast(`Cancelled ${b.id}. ${b.who} has been notified.`); await load(); setPending(null)
  }

  return <div className="space-y-6">
    {rows && (() => { const own = live.filter(b => b.why === 'owner').length, rul = live.length - own
      return <Headline eyebrow="This week" title={<><Big>{own} of {live.length}</Big> meetings went straight to the account owner.</>} sub={<>The other {rul} were matched by territory, skill and language. None needed a manual reassign.</>}>
        <div className="space-y-3">
          <div className="flex h-10 overflow-hidden rounded-xl ring-1 ring-white/10">
            <div className="flex items-center bg-primary px-3 text-[13px] font-semibold transition-[width] duration-slow" style={{ width: `${(own / Math.max(1, live.length)) * 100}%` }}>Owner · {own}</div>
            <div className="flex flex-1 items-center bg-[#33c3a5] px-3 text-[13px] font-semibold text-[#06302a]">Rules · {rul}</div></div>
          <div className="grid grid-cols-3 gap-2 text-center">{[[String(live.length), 'upcoming'], ['0', 'manual reassigns'], [String((rows || []).filter(b => b.status === 'cancelled').length), 'cancelled']].map(([v, l]) => <div key={l} className="rounded-xl bg-white/[.06] py-2"><p className="text-lg font-semibold tabular-nums">{v}</p><p className="text-[11px] text-white/55">{l}</p></div>)}</div>
        </div></Headline> })()}

    {rows ? <TerritoryCards st={st} rows={rows} /> : <Skeleton className="h-[116px]" />}

    <div className={cn('grid items-start gap-4', open && 'xl:grid-cols-[1fr_340px]')}>
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[hsl(var(--line))] bg-white shadow-[0_1px_2px_rgba(12,16,36,.04),0_8px_24px_-12px_rgba(12,16,36,.08)]">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="flex rounded-full bg-[hsl(var(--muted))] p-1 text-[13px]">{(['confirmed', 'cancelled'] as const).map(t =>
          <button key={t} onClick={() => setTab(t)} className={cn('rounded-full px-3.5 py-1 font-medium capitalize transition-all duration-fast', tab === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'confirmed' ? 'Upcoming' : 'Cancelled'} <span className="ml-1 tabular-nums text-muted-foreground">{(rows || []).filter(b => b.status === t).length}</span></button>)}</div>
        <div className="flex rounded-full border border-[hsl(var(--line))] p-1 text-[13px]">{(['list', 'week'] as const).map(v => <button key={v} onClick={() => setView(v)} className={cn('rounded-full px-3.5 py-1 font-medium capitalize transition-all duration-fast', view === v ? 'bg-[hsl(var(--navy))] text-white dark:bg-primary' : 'text-muted-foreground hover:text-foreground')}>{v}</button>)}</div>
        <div className="relative ml-auto w-full sm:w-64"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search bookings" placeholder="Search invitee or rep" className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button aria-label="Clear search" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}</div>
      </div>
      {view === 'week' ? <div className="p-4">{rows ? <WeekGrid st={st} rows={rows} /> : <Skeleton className="h-80" />}</div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">{['When', 'Invitee', 'Meeting', 'Rep', 'Routed by', ''].map(h => <th key={h} className="h-10 px-4 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {!rows ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>) :
              list.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">{q ? 'No bookings match your search.' : tab === 'confirmed' ? 'No upcoming meetings.' : 'No cancelled meetings.'}</td></tr> :
              list.map(b => { const r = rep(b.repId), d = DateTime.fromISO(b.start)
                return <tr key={b.id} onClick={() => setOpen(b.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && setOpen(b.id)} aria-selected={open === b.id} className={cn('cursor-pointer transition-colors hover:bg-gray-50/70 animate-fade-up focus-visible:outline-none focus-visible:bg-primary/5', open === b.id && 'bg-primary/[.06] shadow-[inset_2px_0_0_hsl(var(--primary))]')}>
                  <td className="px-4 py-3"><p className="font-medium tabular-nums">{d.setZone(b.tz).toFormat('ccc d LLL · HH:mm')}</p><p className="text-xs tabular-nums text-muted-foreground">{city(b.tz)}{r ? ` · ${d.setZone(r.tz).toFormat('HH:mm')} ${city(r.tz)}` : ''}</p></td>
                  <td className="px-4 py-3">{b.who}</td>
                  <td className="px-4 py-3 text-muted-foreground">{TOPIC[b.topic] || b.topic}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{r?.name.split(' ').map(x => x[0]).join('')}</span>{r?.name}{r && !r.active && <Badge variant="destructive">Deprovisioned</Badge>}</div></td>
                  <td className="px-4 py-3">{b.why === 'owner' ? <Badge variant="default">Account owner</Badge> : <Badge>Rules</Badge>}</td>
                  <td className="px-4 py-3 text-right">{b.status === 'confirmed' && <Button variant="ghost" size="sm" disabled={pending === b.id} aria-busy={pending === b.id} onClick={e => { e.stopPropagation(); cancel(b) }} className="text-red-600 hover:bg-red-50 hover:text-red-700">{pending === b.id ? 'Cancelling…' : 'Cancel'}</Button>}</td>
                </tr> })}
          </tbody>
        </table>
      </div>}
    </div>
    {open && rows && (() => { const b = rows.find(x => x.id === open); return b ? <Inspector key={b.id} b={b} st={st} onClose={() => setOpen(null)} onCancel={cancel} /> : null })()}
    </div>
  </div>
}
