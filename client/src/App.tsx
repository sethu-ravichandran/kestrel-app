import { useEffect, useState } from 'react'
import { CalendarClock, RotateCcw, Settings2, Clock4 } from 'lucide-react'
import { api, type State } from '@/lib/api'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/input'
import { Toaster } from '@/components/ui/toast'
import Book from './Book'
import Admin from './Admin'

export default function App() {
  const [st, setSt] = useState<State | null>(null)
  const [tab, setTab] = useState<'book' | 'admin'>('book')
  const [k, setK] = useState(0)
  const reload = async () => setSt(await api.state())
  useEffect(() => { reload() }, [])
  return <Toaster>
    <header className="sky sticky top-0 z-30 border-b border-white/10">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <div className="flex items-baseline gap-2"><span className="text-[19px] font-semibold leading-none tracking-[-0.03em]">kestrel</span><span className="size-1.5 translate-y-[-3px] rounded-full bg-accent" /></div>
        <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.1em] text-white/50 sm:inline">Smart Routing · prototype</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="[&_[role=tab]]:text-white/55 [&_[role=tab][aria-selected=true]]:text-white [&_[role=tab]:hover]:text-white"><Tabs value={tab} onChange={setTab} items={[{ v: 'book', label: <><CalendarClock />Book</> }, { v: 'admin', label: <><Settings2 />Admin</> }]} /></div>
          <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10 hover:text-white" aria-label="Reset demo" title="Reset demo" onClick={async () => { await api.reset(); await reload(); setK(k + 1) }}><RotateCcw /></Button>
        </div>
      </div>
    </header>
    <section className="sky -mt-px"><div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pb-12 pt-12">
        <div><p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">{tab === 'book' ? 'Halden Group · booking page' : 'Halden Group · workspace settings'}</p><h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">{tab === 'book' ? <>Meet the right person.</> : <>Who gets which meeting.</>}</h1>
          <p className="mt-3 max-w-[52ch] text-white/65">{tab === 'book' ? 'Each booking is routed by account owner, territory, skill and language, and the page shows you why.' : 'Rules, team, identity and audit, all in one place for the ops team.'}</p></div>
        <a href="/tz.html" className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white">Time-zone lab →</a>
      </div></section>
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      {!st ? <div className="grid gap-4 md:grid-cols-[320px_1fr]"><Skeleton className="h-[460px]" /><Skeleton className="h-[460px]" /></div>
        : <div key={tab + k} className="animate-fade-up">{tab === 'book' ? <Book st={st} reload={reload} /> : <Admin st={st} reload={reload} />}</div>}
    </main>
  </Toaster>
}
