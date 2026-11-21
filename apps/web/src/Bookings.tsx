import { useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import { Search, X } from 'lucide-react'
import { api, city, type Booking, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Skeleton } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const TOPIC: Record<string, string> = { general: 'Intro & pricing', technical: 'Technical deep-dive', billing: 'Billing' }

export default function Bookings({ st }: { st: State }) {
  const toast = useToast()
  const [rows, setRows] = useState<Booking[] | null>(null)
  const [tab, setTab] = useState<'confirmed' | 'cancelled'>('confirmed')
  const [q, setQ] = useState('')
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
    setPending(b.id); await api.cancel(b.id); toast(`Cancelled ${b.id}. ${b.who} has been notified.`); await load(); setPending(null)
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([k, v]) =>
      <div key={k} className="rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]"><p className="text-[13px] text-muted-foreground">{k}</p>
        {rows ? <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight animate-fade-up">{v}</p> : <Skeleton className="mt-2 h-7 w-16" />}</div>)}</div>

    <div className="rounded-xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="flex rounded-md bg-muted p-0.5 text-[13px]">{(['confirmed', 'cancelled'] as const).map(t =>
          <button key={t} onClick={() => setTab(t)} className={cn('rounded px-3 py-1 font-medium capitalize transition-all duration-fast', tab === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t === 'confirmed' ? 'Upcoming' : 'Cancelled'} <span className="ml-1 tabular-nums text-muted-foreground">{(rows || []).filter(b => b.status === t).length}</span></button>)}</div>
        <div className="relative ml-auto w-full sm:w-64"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search bookings" placeholder="Search invitee or rep" className="pl-8" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button aria-label="Clear search" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">{['When', 'Invitee', 'Meeting', 'Rep', 'Routed by', ''].map(h => <th key={h} className="h-10 px-4 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {!rows ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>) :
              list.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">{q ? 'No bookings match your search.' : tab === 'confirmed' ? 'No upcoming meetings.' : 'No cancelled meetings.'}</td></tr> :
              list.map(b => { const r = rep(b.repId), d = DateTime.fromISO(b.start)
                return <tr key={b.id} className="transition-colors hover:bg-gray-50/70 animate-fade-up">
                  <td className="px-4 py-3"><p className="font-medium tabular-nums">{d.setZone(b.tz).toFormat('ccc d LLL · HH:mm')}</p><p className="text-xs tabular-nums text-muted-foreground">{city(b.tz)}{r ? ` · ${d.setZone(r.tz).toFormat('HH:mm')} ${city(r.tz)}` : ''}</p></td>
                  <td className="px-4 py-3">{b.who}</td>
                  <td className="px-4 py-3 text-muted-foreground">{TOPIC[b.topic] || b.topic}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-gray-100 text-[10px] font-semibold">{r?.name.split(' ').map(x => x[0]).join('')}</span>{r?.name}{r && !r.active && <Badge variant="destructive">Deprovisioned</Badge>}</div></td>
                  <td className="px-4 py-3">{b.why === 'owner' ? <Badge variant="default">Account owner</Badge> : <Badge>Rules</Badge>}</td>
                  <td className="px-4 py-3 text-right">{b.status === 'confirmed' && <Button variant="ghost" size="sm" disabled={pending === b.id} aria-busy={pending === b.id} onClick={() => cancel(b)} className="text-red-600 hover:bg-red-50 hover:text-red-700">{pending === b.id ? 'Cancelling…' : 'Cancel'}</Button>}</td>
                </tr> })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
}
