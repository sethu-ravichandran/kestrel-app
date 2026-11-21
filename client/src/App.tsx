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
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <div className="flex items-center gap-2 font-semibold tracking-tight"><span className="grid size-7 place-items-center rounded-md bg-zinc-950 text-white"><CalendarClock className="size-4" /></span>Kestrel</div>
        <span className="hidden rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground sm:inline">Smart Routing</span>
        <div className="ml-auto flex items-center gap-2">
          <Tabs value={tab} onChange={setTab} items={[{ v: 'book', label: <><CalendarClock />Book</> }, { v: 'admin', label: <><Settings2 />Admin</> }]} />
          <Button variant="ghost" size="icon" aria-label="Reset demo" title="Reset demo" onClick={async () => { await api.reset(); await reload(); setK(k + 1) }}><RotateCcw /></Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-xl font-semibold tracking-tight">{tab === 'book' ? 'Book a meeting' : 'Routing admin · Halden Group'}</h1>
          <p className="text-sm text-muted-foreground">{tab === 'book' ? 'Customer view: every booking goes to the right rep, and you can see why.' : 'Ops view: rules, team, identity and audit.'}</p></div>
        <a href="/tz.html" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"><Clock4 className="size-3.5" />Time-zone lab (daylight saving demos)</a>
      </div>
      {!st ? <div className="grid gap-4 md:grid-cols-[320px_1fr]"><Skeleton className="h-[460px]" /><Skeleton className="h-[460px]" /></div>
        : <div key={tab + k} className="animate-fade-up">{tab === 'book' ? <Book st={st} reload={reload} /> : <Admin st={st} reload={reload} />}</div>}
    </main>
  </Toaster>
}
