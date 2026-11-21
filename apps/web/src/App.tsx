import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, ChevronsUpDown, Copy, Monitor, Moon, Sun, ExternalLink, GitBranch, LayoutList, RotateCcw, ScrollText, Users } from 'lucide-react'
import { api, type State } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/input'
import { Toaster, useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import Book from './Book'
import Admin from './Admin'
import Bookings from './Bookings'
import Insights from './Insights'

type Page = 'bookings' | 'insights' | 'page' | 'routing' | 'team' | 'audit'
const NAV: { v: Page; label: string; icon: typeof LayoutList }[] = [
  { v: 'bookings', label: 'Bookings', icon: LayoutList }, { v: 'insights', label: 'Insights', icon: BarChart3 }, { v: 'page', label: 'Booking page', icon: CalendarDays },
  { v: 'routing', label: 'Routing', icon: GitBranch }, { v: 'team', label: 'Team & identity', icon: Users }, { v: 'audit', label: 'Audit log', icon: ScrollText }]
const TITLE: Record<Page, [string, string]> = {
  bookings: ['Bookings', 'Every meeting across the team, and how it was routed.'],
  insights: ['Insights', 'Is routing getting customers to the right person?'],
  page: ['Booking page', 'What your customers see. Each booking is routed to the right rep.'],
  routing: ['Routing', 'Decide who gets which meeting.'],
  team: ['Team & identity', 'Who is in the routing pool, and how people join and leave it.'],
  audit: ['Audit log', 'Every change to routing, team and bookings. Exportable for compliance reviews.'],
}

function Shell() {
  const toast = useToast()
  const [st, setSt] = useState<State | null>(null)
  const [page, setPage] = useState<Page>('bookings')
  const [k, setK] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => { try { const v = localStorage.getItem('kestrel-theme'); return v === 'light' || v === 'dark' ? v : 'system' } catch { return 'system' } })
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches))
    apply(); try { localStorage.setItem('kestrel-theme', theme) } catch { /* ignore */ }
    mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply)
  }, [theme])
  const reload = async () => setSt(await api.state())
  useEffect(() => { reload() }, [])
  function nav(v: (typeof NAV)[number]['v']) {
    setPage(v); window.scrollTo({ top: 0 })
  }
  const link = location.origin + '/halden'
  return <div className="flex min-h-screen">
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[hsl(var(--navy))] text-white md:flex [background-image:radial-gradient(120%_60%_at_0%_100%,hsl(226_100%_50%/.22),transparent_60%)]">
      <div className="flex items-center gap-2 px-5 pb-2 pt-5"><span className="size-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" /><span className="text-[17px] font-semibold tracking-[-0.03em]">kestrel</span></div>
      <button className="mx-3 mb-2 mt-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.04] p-2 text-left transition-colors hover:bg-white/[.08]" aria-label="Switch workspace">
        <div className="grid size-8 place-items-center rounded-lg bg-white text-[13px] font-bold text-[hsl(var(--navy))]">H</div>
        <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">Halden Group</p><p className="text-xs text-white/50">Enterprise · 900 seats</p></div>
        <ChevronsUpDown className="size-4 text-white/40" /></button>
      <nav className="flex flex-col gap-0.5 px-3">{NAV.map(n => { const on = n.v === page; const I = n.icon
        return <button key={n.v} onClick={() => nav(n.v)} className={cn('flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors duration-fast', on ? 'bg-primary/20 font-medium text-white shadow-[inset_2px_0_0_hsl(var(--primary))]' : 'text-white/60 hover:bg-white/[.06] hover:text-white')}>
          <I className="size-4" />{n.label}</button> })}</nav>
      <div className="mt-auto space-y-0.5 p-3">
        <button onClick={async () => { await api.reset(); await reload(); setK(k + 1); toast('Demo data reset') }} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/50 hover:bg-white/[.06] hover:text-white"><RotateCcw className="size-4" />Reset demo data</button>
        <div className="mt-2 flex items-center gap-2.5 border-t border-white/10 px-3 pt-3"><div className="grid size-7 place-items-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">MR</div><div className="text-xs"><p className="font-medium">Maya Raman</p><p className="text-white/50">CPO (Admin)</p></div></div>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      {/* mobile nav */}
      <div className="sticky top-0 z-30 flex gap-1 overflow-x-auto border-b bg-white px-3 py-2 md:hidden">{NAV.slice(0, 4).map(n => <button key={n.v} onClick={() => nav(n.v)} className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-[13px]', n.v === page ? 'bg-muted font-medium' : 'text-muted-foreground')}>{n.label}</button>)}</div>
      <header className="border-b border-[hsl(var(--line))] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-5">
          <div><h1 className="text-[22px] font-semibold tracking-[-0.03em]">{TITLE[page][0]}</h1><p className="mt-0.5 text-[13px] text-muted-foreground">{TITLE[page][1]}</p></div>
          {page === 'page' && <div className="flex items-center gap-2">
            <div className="hidden h-9 items-center rounded-md border bg-muted/50 px-3 text-[13px] tabular-nums text-muted-foreground sm:flex">{link.replace(/^https?:\/\//, '')}</div>
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); toast('Booking link copied') }}><Copy />Copy link</Button>
            <Button variant="outline" size="icon" aria-label="Open in new tab" onClick={() => window.open('/', '_blank')}><ExternalLink /></Button></div>}
          <div className="order-last ml-auto sm:order-none sm:ml-0" />
          {page === 'bookings' && <Button className="" onClick={() => setPage('page')}><CalendarDays />New booking</Button>}
  <div className="ml-auto flex items-center gap-3">
            <div role="radiogroup" aria-label="Theme" className="relative grid w-[100px] shrink-0 grid-cols-3 rounded-full border border-[hsl(var(--line))] bg-[hsl(var(--muted))] p-1">
              <span aria-hidden className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-[hsl(var(--card))] shadow-sm transition-transform duration-base ease-out" style={{ transform: `translateX(${['light', 'dark', 'system'].indexOf(theme) * 100}%)` }} />
              {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(([v, I, l]) => <button key={v} role="radio" aria-checked={theme === v} aria-label={l} title={l} onClick={() => setTheme(v)}
                className={cn('relative z-10 flex h-6 items-center justify-center rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', theme === v ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}><I className="size-3.5" /></button>)}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {!st ? <Skeleton className="h-[480px]" /> : <div key={page + k} className="animate-fade-up">
          {page === 'bookings' ? <Bookings st={st} /> : page === 'insights' ? <Insights st={st} /> : page === 'page' ? <Book st={st} reload={reload} /> : <Admin st={st} reload={reload} show={page as 'routing' | 'team' | 'audit'} />}</div>}
      </main>
    </div>
  </div>
}
export default function App() { return <Toaster><Shell /></Toaster> }
