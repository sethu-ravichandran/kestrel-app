import { useEffect, useState } from 'react'
import { CalendarDays, ChevronsUpDown, Clock4, Copy, ExternalLink, GitBranch, LayoutList, RotateCcw, ScrollText, Users } from 'lucide-react'
import { api, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/input'
import { Toaster, useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import Book from './Book'
import Admin from './Admin'
import Bookings from './Bookings'

type Page = 'bookings' | 'page' | 'routing'
const NAV: { v: Page | 'team' | 'audit'; label: string; icon: typeof LayoutList }[] = [
  { v: 'bookings', label: 'Bookings', icon: LayoutList }, { v: 'page', label: 'Booking page', icon: CalendarDays },
  { v: 'routing', label: 'Routing', icon: GitBranch }, { v: 'team', label: 'Team & identity', icon: Users }, { v: 'audit', label: 'Audit log', icon: ScrollText }]
const TITLE: Record<Page, [string, string]> = {
  bookings: ['Bookings', 'Every meeting across the team, and how it was routed.'],
  page: ['Booking page', 'What your customers see. Each booking is routed to the right rep.'],
  routing: ['Routing', 'Decide who gets which meeting.'],
}

function Shell() {
  const toast = useToast()
  const [st, setSt] = useState<State | null>(null)
  const [page, setPage] = useState<Page>('bookings')
  const [k, setK] = useState(0)
  const reload = async () => setSt(await api.state())
  useEffect(() => { reload() }, [])
  function nav(v: (typeof NAV)[number]['v']) {
    if (v === 'team' || v === 'audit') { setPage('routing'); setTimeout(() => document.getElementById(v)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); return }
    setPage(v); window.scrollTo({ top: 0 })
  }
  const link = location.origin + '/halden'
  return <div className="flex min-h-screen">
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-white md:flex">
      <button className="m-3 flex items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted" aria-label="Switch workspace">
        <div className="grid size-8 place-items-center rounded-md bg-gray-900 text-[13px] font-bold text-white">H</div>
        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">Halden Group</p><p className="text-xs text-muted-foreground">Enterprise · 900 seats</p></div>
        <ChevronsUpDown className="size-4 text-muted-foreground" /></button>
      <nav className="flex flex-col gap-0.5 px-3">{NAV.map(n => { const on = n.v === page; const I = n.icon
        return <button key={n.v} onClick={() => nav(n.v)} className={cn('flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors duration-fast', on ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
          <I className="size-4" />{n.label}</button> })}</nav>
      <div className="mt-auto space-y-0.5 p-3">
        <a href="/tz.html" className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"><Clock4 className="size-4" />Time-zone lab</a>
        <button onClick={async () => { await api.reset(); await reload(); setK(k + 1); toast('Demo data reset') }} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"><RotateCcw className="size-4" />Reset demo data</button>
        <div className="mt-2 flex items-center gap-2.5 border-t px-2.5 pt-3"><div className="grid size-7 place-items-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">MR</div><div className="text-xs"><p className="font-medium">Maya Raman</p><p className="text-muted-foreground">Admin</p></div></div>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      {/* mobile nav */}
      <div className="sticky top-0 z-30 flex gap-1 overflow-x-auto border-b bg-white px-3 py-2 md:hidden">{NAV.slice(0, 3).map(n => <button key={n.v} onClick={() => nav(n.v)} className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-[13px]', n.v === page ? 'bg-muted font-medium' : 'text-muted-foreground')}>{n.label}</button>)}</div>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-5">
          <div><h1 className="text-xl font-semibold tracking-tight">{TITLE[page][0]}</h1><p className="mt-0.5 text-[13px] text-muted-foreground">{TITLE[page][1]}</p></div>
          {page === 'page' && <div className="ml-auto flex items-center gap-2">
            <div className="hidden h-9 items-center rounded-md border bg-muted/50 px-3 text-[13px] tabular-nums text-muted-foreground sm:flex">{link.replace(/^https?:\/\//, '')}</div>
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); toast('Booking link copied') }}><Copy />Copy link</Button>
            <Button variant="outline" size="icon" aria-label="Open in new tab" onClick={() => window.open('/', '_blank')}><ExternalLink /></Button></div>}
          {page === 'bookings' && <Button className="ml-auto" onClick={() => setPage('page')}><CalendarDays />New booking</Button>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {!st ? <Skeleton className="h-[480px]" /> : <div key={page + k} className="animate-fade-up">
          {page === 'bookings' ? <Bookings st={st} /> : page === 'page' ? <Book st={st} reload={reload} /> : <Admin st={st} reload={reload} />}</div>}
      </main>
    </div>
  </div>
}
export default function App() { return <Toaster><Shell /></Toaster> }
