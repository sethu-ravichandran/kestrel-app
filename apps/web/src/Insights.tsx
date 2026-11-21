import { useEffect, useState } from 'react'
import { api, type Insights as Data, type State } from '@/lib/api'
import { Skeleton } from '@/components/ui/input'
import { REP_COLOR } from './Team'
import { cn } from '@/lib/utils'

const card = 'rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(12,16,36,.04),0_8px_24px_-12px_rgba(12,16,36,.08)] animate-fade-up'
const SEG = [['owner', 'Account owner', 'bg-primary'], ['terr', 'Territory', 'bg-[#33c3a5]'], ['skill', 'Skill', 'bg-[#6d4aff]'], ['rr', 'Round robin only', 'bg-[hsl(var(--muted-foreground)/.35)]']] as const

function Spark({ v, className }: { v: number[]; className?: string }) {
  const max = Math.max(...v), min = Math.min(...v), W = 96, H = 28
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * W},${H - 2 - ((x - min) / Math.max(1, max - min)) * (H - 4)}`).join(' ')
  return <svg width={W} height={H} className={className} aria-hidden><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" className="[stroke-dasharray:200] [stroke-dashoffset:200] animate-[spark_.8s_ease-out_forwards]" /></svg>
}

export default function Insights({ st }: { st: State }) {
  const [d, setD] = useState<Data | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  useEffect(() => { api.insights().then(setD) }, [])
  if (!d) return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}</div><Skeleton className="h-80 rounded-2xl" /></div>
  const maxW = Math.max(...d.weeks.map(w => w.total)), maxH = Math.max(...d.heat.flat())
  const K = d.kpis
  const tiles: [string, string, string?, boolean?][] = [
    ['Bookings · last 4 weeks', String(K.bookings30)],
    ['Right rep, first time', K.rightNow + '%', `was ${K.rightBefore}% with round robin`, true],
    ['Manual reassigns avoided', String(K.reassignsSaved), 'last 4 weeks'],
    ['Reps taking meetings', `${st.reps.filter(r => r.active && !r.away).length} / ${st.reps.length}`],
  ]
  return <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Illustrative 8-week history (smart routing switched on 4 weeks ago) combined with live bookings.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles.map(([k, v, sub, good]) => <div key={k} className={cn(card, 'p-5')}>
      <p className="text-[13px] text-muted-foreground">{k}</p><p className="mt-2 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.04em]">{v}</p>
      {sub && <p className={cn('mt-2 text-xs', good ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{good ? '▲ ' : ''}{sub}</p>}</div>)}</div>

    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className={cn(card, 'p-5')}>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">How meetings were routed</h3>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{SEG.map(([, l, c]) => <span key={l} className="flex items-center gap-1.5"><span className={cn('size-2 rounded-sm', c)} />{l}</span>)}</div></div>
        <div className="mt-6 flex h-52 items-end gap-3">{d.weeks.map((w, i) => <div key={w.label} className="group flex h-full flex-1 flex-col items-center gap-2" onMouseEnter={() => setHover(w.label)} onMouseLeave={() => setHover(null)}>
          <div className="flex w-full flex-1 items-end"><div className="relative flex w-full origin-bottom flex-col-reverse overflow-hidden rounded-md transition-opacity duration-fast" style={{ height: `${(w.total / maxW) * 100}%`, opacity: hover && hover !== w.label ? .45 : 1, animation: `grow .5s ${i * 50}ms cubic-bezier(.2,.8,.2,1) both` }}>
            {SEG.map(([k, , c]) => <div key={k} className={c} style={{ height: `${(w[k] / w.total) * 100}%` }} />)}
            {hover === w.label && <div className="pointer-events-none absolute inset-x-0 top-1 text-center text-[10px] font-semibold text-white">{w.total}</div>}
          </div></div>
          <span className={cn('text-[11px] tabular-nums', i === 4 ? 'font-semibold text-primary' : 'text-muted-foreground')}>{w.label}</span></div>)}</div>
        <p className="mt-3 text-xs text-muted-foreground">Smart routing switched on in the week of {d.weeks[4].label}. Round robin is now only used to break ties.</p>
      </div>

      <div className={cn(card, 'p-5')}>
        <h3 className="font-semibold">When customers book</h3><p className="text-xs text-muted-foreground">Rep-local time, Mon–Fri</p>
        <div className="mt-4 grid grid-cols-[32px_repeat(10,1fr)] gap-1">
          <div />{Array.from({ length: 10 }, (_, h) => <div key={h} className="text-center text-[10px] tabular-nums text-muted-foreground">{h + 8}</div>)}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, r) => [<div key={day} className="self-center text-[11px] text-muted-foreground">{day}</div>,
            ...d.heat[r].map((v, c) => <div key={day + c} title={`${day} ${c + 8}:00 · ${v} bookings`} className="aspect-square transition-transform duration-fast hover:scale-110" style={{ animation: `fade-up .3s ${(r * 10 + c) * 8}ms both` }}>
              <div className="size-full rounded-[4px] bg-primary" style={{ opacity: 0.08 + 0.92 * (v / maxH) }} /></div>)])}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">Fewer<div className="h-2 flex-1 rounded-full bg-gradient-to-r from-primary/10 to-primary" />More</div>
      </div>
    </div>

    <div className={cn(card, 'p-5')}>
      <h3 className="font-semibold">Load per rep</h3><p className="text-xs text-muted-foreground">Meetings per week over the last 8 weeks. Routing now spreads work evenly.</p>
      <div className="mt-4 divide-y divide-[hsl(var(--line))]">{d.reps.map(r => { const now = r.trend[r.trend.length - 1], mx = Math.max(...d.reps.flatMap(x => x.trend))
        return <div key={r.id} className={cn('grid grid-cols-[180px_1fr_100px_40px] items-center gap-4 py-2.5', !r.active && 'opacity-40')}>
          <div className="flex items-center gap-2.5"><span className={cn('grid size-7 place-items-center rounded-full text-[11px] font-semibold', REP_COLOR[r.id])}>{r.name.split(' ').map(x => x[0]).join('')}</span><div><p className="text-[13px] font-medium">{r.name}</p><p className="text-[11px] text-muted-foreground">{r.terr}</p></div></div>
          <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-primary transition-[width] duration-slow" style={{ width: `${(now / mx) * 100}%` }} /></div>
          <Spark v={r.trend} className="text-primary" /><span className="text-right text-[13px] font-semibold tabular-nums">{now}</span></div> })}</div>
    </div>
  </div>
}
