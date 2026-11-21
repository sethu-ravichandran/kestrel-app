import { DateTime } from 'luxon'
import type { Booking, State } from '@/lib/api'
import { cn } from '@/lib/utils'

// one colour per rep, used across territory cards and the week grid
export const REP_COLOR: Record<string, string> = {
  ana: 'bg-[#1f5cff] text-white', sam: 'bg-[#0b1a4a] text-white', ben: 'bg-[#0e7c66] text-white', kofi: 'bg-[#33c3a5] text-[#06302a]',
  lena: 'bg-[#c6e85a] text-[#253205]', javi: 'bg-[#6d4aff] text-white', mei: 'bg-[#ff9f43] text-[#3d2200]',
}
const TERR: [string, string][] = [['NA-West', 'Seattle · San Francisco'], ['NA-East', 'New York · Toronto'], ['EMEA', 'Berlin · Madrid · London'], ['APAC', 'Singapore · Sydney']]
const initials = (n: string) => n.split(' ').map(x => x[0]).join('')

export function TerritoryCards({ st, rows }: { st: State; rows: Booking[] }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{TERR.map(([t, sub]) => {
    const reps = st.reps.filter(r => r.terr === t), avail = reps.filter(r => r.active && !r.away)
    const load = rows.filter(b => b.status === 'confirmed' && reps.some(r => r.id === b.repId)).length
    const pct = Math.min(100, Math.round(load / Math.max(1, avail.length * 4) * 100)) // 4 meetings/rep/week = full
    return <div key={t} className="rounded-2xl border border-[#e6e9f2] bg-white p-4 shadow-[0_1px_2px_rgba(12,16,36,.04),0_8px_24px_-12px_rgba(12,16,36,.08)] animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">{reps.map(r => <span key={r.id} title={r.name} className={cn('grid size-9 place-items-center rounded-full text-[12px] font-semibold ring-2 ring-white transition-opacity', REP_COLOR[r.id], (!r.active || r.away) && 'opacity-30')}>{initials(r.name)}</span>)}</div>
        <div className="min-w-0"><p className="font-semibold">{t}</p><p className="truncate text-xs text-muted-foreground">{sub}</p></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1f8]"><div className={cn('h-full rounded-full transition-[width] duration-slow ease-out', pct > 80 ? 'bg-amber-500' : 'bg-primary')} style={{ width: pct + '%' }} /></div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{avail.length} of {reps.length} available</span><span className="tabular-nums">{load} meeting{load === 1 ? '' : 's'}</span></div>
    </div> })}</div>
}

export function WeekGrid({ st, rows, viewTz = 'America/New_York' }: { st: State; rows: Booking[]; viewTz?: string }) {
  const mon = DateTime.fromISO(st.now).setZone(viewTz).startOf('week')
  const days = Array.from({ length: 7 }, (_, i) => mon.plus({ days: i }))
  const H0 = 0, H1 = 24, PX = 26 // 26px per hour
  const live = rows.filter(b => b.status === 'confirmed')
  const hours = Array.from({ length: (H1 - H0) / 2 }, (_, i) => H0 + i * 2)
  return <div className="overflow-x-auto">
    <div className="min-w-[760px]">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[#e6e9f2]">
        <div />{days.map(d => <div key={d.toISODate()} className={cn('py-2 text-center text-xs', d.hasSame(DateTime.fromISO(st.now), 'day') ? 'font-semibold text-primary' : 'text-muted-foreground')}>{d.toFormat('cccc')}<br /><span className="tabular-nums">{d.toFormat('dd.LL')}</span></div>)}
      </div>
      <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: (H1 - H0) * PX }}>
        <div className="relative">{hours.map(h => <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: (h - H0) * PX }}>{String(h).padStart(2, '0')}:00</span>)}</div>
        {days.map(d => <div key={d.toISODate()} className="relative border-l border-[#eef1f8]" style={{ backgroundImage: `repeating-linear-gradient(to bottom, #eef1f8 0 1px, transparent 1px ${PX * 2}px)` }}>
          {live.filter(b => DateTime.fromISO(b.start).setZone(viewTz).hasSame(d, 'day')).map((b, i) => {
            const s = DateTime.fromISO(b.start).setZone(viewTz), r = st.reps.find(x => x.id === b.repId)
            return <div key={b.id} title={`${b.who} · ${r?.name}`} style={{ top: (s.hour + s.minute / 60 - H0) * PX + 1, height: PX - 2, animationDelay: i * 40 + 'ms' }}
              className={cn('absolute inset-x-1 overflow-hidden rounded-md px-1.5 text-[11px] font-medium leading-[24px] shadow-sm transition-transform duration-fast hover:z-10 hover:scale-[1.03] animate-fade-up', REP_COLOR[b.repId] || 'bg-gray-500 text-white')}>
              <span className="tabular-nums opacity-80">{s.toFormat('HH:mm')}</span> {r ? r.name.split(' ')[0] : ''} · {b.who.split('@')[1]}</div> })}
        </div>)}
      </div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Times shown in New York time. Each colour is one rep.</p>
  </div>
}
