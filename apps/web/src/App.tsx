import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { api, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/input'
import { Toaster } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import Book from './Book'
import Admin from './Admin'

export default function App() {
  const [st, setSt] = useState<State | null>(null)
  const [tab, setTab] = useState<'book' | 'admin'>('book')
  const [k, setK] = useState(0)
  const reload = async () => setSt(await api.state())
  useEffect(() => { reload() }, [])
  return <Toaster>
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-6 px-4">
        <span className="font-semibold tracking-tight">Kestrel</span>
        <nav className="flex h-full gap-5 text-[13px]">{([['book', 'Booking page'], ['admin', 'Routing settings']] as const).map(([v, l]) =>
          <button key={v} onClick={() => setTab(v)} className={cn('relative h-full text-muted-foreground transition-colors hover:text-foreground', tab === v && 'font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-gray-900')}>{l}</button>)}</nav>
        <div className="ml-auto flex items-center gap-3">
          <a href="/tz.html" className="text-[13px] text-muted-foreground hover:text-foreground">Time-zone lab</a>
          <Button variant="ghost" size="icon" aria-label="Reset demo data" title="Reset demo data" onClick={async () => { await api.reset(); await reload(); setK(k + 1) }}><RotateCcw /></Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-10">
      {tab === 'admin' && <div className="mb-6"><h1 className="text-xl font-semibold">Routing settings</h1><p className="mt-1 text-[13px] text-muted-foreground">Decide who gets which meeting at Halden Group.</p></div>}
      {!st ? <Skeleton className="mx-auto h-[480px] max-w-5xl" />
        : <div key={tab + k}>{tab === 'book' ? <Book st={st} reload={reload} /> : <Admin st={st} reload={reload} />}</div>}
    </main>
  </Toaster>
}
