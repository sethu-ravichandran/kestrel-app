import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { ArrowDown, ArrowUp, Download, KeyRound, Lightbulb, ShieldCheck, UserX } from 'lucide-react'
import { api, city, type Audit, type State, type SimRow } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NativeSelect, Skeleton } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Sim = { rows: SimRow[]; oldGood: number; good: number; total: number }
const Th = (p: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className="h-9 px-3 text-left font-mono text-[10.5px] font-normal uppercase tracking-[0.08em] text-muted-foreground" {...p} />
const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-3 py-2.5 align-top', className)} {...p} />

export default function Admin({ st, reload }: { st: State; reload: () => Promise<void> }) {
  const toast = useToast()
  const [sim, setSim] = useState<Sim | null>(null)
  const [audit, setAudit] = useState<Audit[]>([])
  const [dep, setDep] = useState('ana')
  const [hand, setHand] = useState<{ rep: string; peer: string; accounts: string[]; meetings: number; id: string } | null>(null)
  const refresh = async () => { await reload(); const [s, a] = await Promise.all([api.simulate(), api.audit()]); setSim(s); setAudit(a) }
  useEffect(() => { refresh() }, []) // eslint-disable-line
  const R = st.rules
  async function save(rules: typeof R, msg: string) { await api.rules(rules); toast(msg); refresh() }
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= R.length) return; const n = R.slice(); [n[i], n[j]] = [n[j], n[i]]; save(n, 'Rule order saved') }
  const active = st.reps.filter(r => r.active)

  return <div className="space-y-12">
    {/* buffer nudge */}
    <Card><CardContent className="flex flex-wrap items-center gap-6 pt-4">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent">{st.buffer ? 'Applied' : 'Suggestion'}</span>
      {st.buffer ? <p className="flex-1 text-sm"><b>10-min buffer is on for all reps.</b> New bookings leave room for notes and travel.</p>
        : <div className="min-w-[240px] flex-1"><p className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">Your reps had 23 back-to-back meetings last week.</p><p className="text-sm text-muted-foreground">Buffer time already exists, but it was hidden under Advanced settings. 31 accounts asked for it, and only 5 had found it.</p></div>}
      <Button variant={st.buffer ? 'outline' : 'default'} onClick={async () => { await api.buffer(!st.buffer); toast(st.buffer ? 'Buffers off' : '10-min buffers on for all reps'); refresh() }}>{st.buffer ? 'Undo' : 'Add 10-min buffers for everyone'}</Button>
    </CardContent></Card>

    <div className="grid items-start gap-10 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Routing rules</CardTitle><CardDescription>Rules run top to bottom. The first rule that finds an available rep wins, and round robin only breaks ties.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {R.map((r, i) => <div key={r.k} className={cn('flex items-center gap-3 border-b border-foreground/10 py-3 transition-all duration-200', !r.on && 'opacity-45')}>
            <span className="w-6 font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.t}</p><p className="text-xs text-muted-foreground">{r.d}</p></div>
            <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></Button>
            <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === R.length - 1}><ArrowDown /></Button>
            <button role="switch" aria-checked={r.on} aria-label={`Toggle ${r.k}`} onClick={() => save(R.map((x, k) => k === i ? { ...x, on: !x.on } : x), r.on ? 'Rule turned off' : 'Rule turned on')}
              className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', r.on ? 'bg-accent' : 'bg-foreground/20')}>
              <span className={cn('absolute top-0.5 size-4 rounded-full bg-background transition-transform duration-200', r.on ? 'translate-x-[18px]' : 'translate-x-0.5')} /></button>
          </div>)}
          <p className="px-1 pt-1 text-xs text-muted-foreground">Fallback: round robin within whatever group is left</p>
        </CardContent></Card>

      <Card className="min-h-[420px]"><CardHeader><CardTitle>Simulator</CardTitle><CardDescription>Last week's 8 bookings, re-routed with these rules.</CardDescription></CardHeader>
        <CardContent>{!sim ? <Skeleton className="h-72" /> : <>
          <div className="mb-4 grid grid-cols-3 divide-x divide-foreground/15 border-y border-foreground/15">
            <div className="px-3 py-3"><p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Old round robin</p><p className="font-mono text-[30px] text-muted-foreground line-through decoration-1">{sim.oldGood}/{sim.total}</p></div>
            <div className="px-3 py-3"><p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">Smart routing</p><p key={sim.good} className="font-mono text-[30px] text-foreground animate-fade-up">{sim.good}/{sim.total}</p></div>
            <div className="px-3 py-3"><p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">Fixes saved</p><p className="font-mono text-[30px]">{sim.good - sim.oldGood}</p></div></div>
          <table className="w-full text-[13px]"><thead className="border-b border-foreground/15"><tr><Th>Invitee</Th><Th>Old</Th><Th>Smart</Th></tr></thead>
            <tbody className="divide-y">{sim.rows.map(x => <tr key={x.inv.email} className="transition-colors hover:bg-muted/50"><Td><p>{x.inv.email}</p><p className="text-xs text-muted-foreground">{x.inv.loc} · {x.inv.topic}</p></Td>
              <Td><Badge variant={x.oldFit ? 'success' : 'destructive'}>{x.old}</Badge></Td><Td><Badge variant={x.neuFit ? 'success' : 'destructive'}>{x.neu}</Badge></Td></tr>)}</tbody></table></>}
        </CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Team</CardTitle></CardHeader><CardContent className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]"><thead className="border-b border-foreground/15"><tr><Th>Rep</Th><Th>Territory</Th><Th>Skills</Th><Th>Languages</Th><Th>Owns</Th><Th>Status</Th></tr></thead>
        <tbody className="divide-y">{st.reps.map(r => <tr key={r.id} className={cn('transition-all hover:bg-muted/50', !r.active && 'opacity-50')}>
          <Td className="font-medium">{r.name}<p className="text-xs font-normal text-muted-foreground">{city(r.tz)}</p></Td><Td>{r.terr}</Td><Td>{r.skills.join(', ')}</Td><Td>{r.langs.join(', ')}</Td><Td>{r.owns.join(', ') || '–'}</Td>
          <Td>{!r.active ? <Badge variant="destructive">Deprovisioned</Badge> : <Button variant="outline" size="sm" onClick={async () => { await api.leave(r.id, !r.away); toast(`${r.name} ${r.away ? 'is back' : 'is on leave'}`); refresh() }}>{r.away ? 'On leave' : 'Available'}</Button>}</Td></tr>)}</tbody></table>
    </CardContent></Card>

    <div className="grid items-start gap-10 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex flex-wrap items-baseline gap-3">Identity &amp; SCIM <Badge variant="success">Okta connected</Badge></CardTitle>
        <CardDescription>When IT deprovisions someone in Okta, Kestrel removes them from routing and hands their accounts and meetings to a teammate in the same territory. Every step is logged.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2"><NativeSelect className="max-w-[220px]" value={dep} onChange={e => setDep(e.target.value)}>{active.map(r => <option key={r.id} value={r.id}>{r.name} ({r.terr})</option>)}</NativeSelect>
            <Button variant="destructive" onClick={async () => { const id = dep; const h = (await api.scimDeactivate(id))['urn:kestrel:handover']; setHand({ ...h, id }); toast('SCIM: user deprovisioned and work handed over'); await refresh(); const nx = st.reps.find(r => r.active && r.id !== id); if (nx) setDep(nx.id) }}><UserX />Simulate Okta deprovision</Button></div>
          {hand && <Alert variant="success"><p>Okta sent <code className="font-mono text-[11.5px]">PATCH /scim/v2/Users/{hand.id} {'{active:false}'}</code></p>
            <ul className="mt-1 list-disc pl-5"><li>{hand.rep} removed from routing</li><li>{hand.accounts.length ? `${hand.accounts.join(', ')} → ${hand.peer}` : 'No named accounts to move'}</li><li>{hand.meetings} upcoming meetings → {hand.peer}, with one email to each invitee</li></ul></Alert>}
        </CardContent></Card>

      <Card><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Audit log</CardTitle><CardDescription>For compliance reviews</CardDescription></div>
        <Button variant="outline" size="sm" onClick={() => { location.href = '/api/audit.csv' }}><Download />Export CSV</Button></CardHeader>
        <CardContent className="max-h-[300px] overflow-y-auto"><ol className="divide-y divide-foreground/10">{audit.map((a, i) => <li key={a.t + i} className="flex gap-3 py-2 text-[13px] animate-fade-up">
          <span className="w-[92px] shrink-0 font-mono text-[11px] text-muted-foreground">{DateTime.fromISO(a.t).toFormat('d LLL HH:mm')}</span>
          <div><p className="font-medium">{a.ev} <span className="font-normal text-muted-foreground">· {a.who}</span></p><p className="text-muted-foreground">{a.d}</p></div></li>)}</ol></CardContent></Card>
    </div>
  </div>
}
