import { useEffect, useState } from 'react'
import { Check, User } from 'lucide-react'
import type { RouteRes } from '@/lib/api'
import { REP_COLOR } from './Team'
import { cn } from '@/lib/utils'

const SHORT: Record<string, string> = { Existing: 'Account owner', Territory: 'Territory', Topic: 'Skill', Language: 'Language' }
const label = (t: string) => SHORT[t.split(' ')[0]] || t.split('→')[0].trim()

// "Finding your person": lights each routing step in turn, then lands on the rep.
export default function Matching({ res, onDone }: { res: RouteRes | null; onDone: () => void }) {
  const steps = res ? res.trace.filter(s => !s.t.startsWith('Round robin')) : []
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!res) return
    if (n <= steps.length) { const t = setTimeout(() => setN(n + 1), n === 0 ? 150 : 260); return () => clearTimeout(t) }
    const t = setTimeout(onDone, 750); return () => clearTimeout(t)
  }, [res, n]) // eslint-disable-line
  const rep = res?.rep, landed = res && n > steps.length
  return <div className="mx-auto max-w-3xl rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--card))] p-8 text-center shadow-sm animate-fade-up" aria-live="polite">
    <p className="text-[13px] text-muted-foreground">{landed ? 'Matched' : 'Finding the right person for you…'}</p>
    <div className="mt-8 flex items-center justify-center">
      <Node on label="You"><User className="size-4" /></Node>
      {steps.map((s, i) => { const lit = n > i, ok = s.s === 'ok', decided = ok && res?.why === 'owner' && i === 0
        return <div key={i} className="flex items-center">
          <Line on={lit} />
          <Node on={lit} tone={!lit ? 'idle' : s.s === 'mut' ? 'skip' : s.s === 'warn' ? 'warn' : 'ok'} label={label(s.t)} sub={lit ? (s.s === 'mut' ? 'n/a' : s.s === 'warn' ? 'relaxed' : decided ? 'match' : '✓') : ''}>
            {lit && s.s !== 'mut' ? <Check className="size-4" /> : <span className="text-[11px] tabular-nums">{i + 1}</span>}</Node>
        </div> })}
      <Line on={!!landed} />
      <div className={cn('flex flex-col items-center transition-all duration-slow ease-out', landed ? 'scale-100 opacity-100' : 'scale-75 opacity-30')}>
        <span className={cn('grid size-14 place-items-center rounded-full text-base font-semibold ring-4 ring-primary/20', rep && landed ? REP_COLOR[rep.id] : 'bg-[hsl(var(--muted))]')}>{rep && landed ? rep.name.split(' ').map(x => x[0]).join('') : '?'}</span>
        <span className="mt-2 h-4 text-[12px] font-medium">{landed && rep ? rep.name : ''}</span>
      </div>
    </div>
    <p className={cn('mt-8 h-5 text-[13px] text-muted-foreground transition-opacity duration-base', landed ? 'opacity-100' : 'opacity-0')}>
      {rep && (res?.why === 'owner' ? `${rep.name.split(' ')[0]} already looks after your account.` : `${rep.name.split(' ')[0]} covers ${rep.terr} and speaks ${rep.langs.join(', ')}.`)}</p>
  </div>
}
function Node({ on, tone = 'ok', label, sub, children }: { on: boolean; tone?: 'ok' | 'warn' | 'skip' | 'idle'; label: string; sub?: string; children: React.ReactNode }) {
  return <div className="flex w-[76px] flex-col items-center">
    <span className={cn('grid size-10 place-items-center rounded-full border-2 transition-all duration-base ease-out',
      !on || tone === 'idle' ? 'border-[hsl(var(--line))] text-muted-foreground' : tone === 'ok' ? 'scale-110 border-primary bg-primary text-white shadow-[0_0_0_6px_hsl(var(--primary)/.15)]' : tone === 'warn' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-[hsl(var(--line))] bg-[hsl(var(--muted))] text-muted-foreground')}>{children}</span>
    <span className="mt-2 text-[11px] font-medium leading-tight">{label}</span><span className="h-3 text-[10px] text-muted-foreground">{sub}</span>
  </div>
}
const Line = ({ on }: { on: boolean }) => <div className="relative -mt-8 h-0.5 w-6 overflow-hidden rounded bg-[hsl(var(--line))] sm:w-10"><div className={cn('absolute inset-y-0 left-0 bg-primary transition-[width] duration-base ease-out', on ? 'w-full' : 'w-0')} /></div>
