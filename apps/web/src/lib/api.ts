import type { Booking, Rep, Rule, Step, Invitee, State, RouteRes, SimRow, Audit } from '@kestrel/shared'
export type { Booking, Rep, Rule, Step, Invitee, State, RouteRes, SimRow, Audit }
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const apiUrl = (p: string) => BASE + p
async function call<T>(p: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json(); if (!r.ok) throw new Error(j.error || String(r.status)); return j
}
export const api = {
  state: () => call<State>('/api/state'),
  route: (inv: Invitee) => call<RouteRes>('/api/route', 'POST', inv),
  bookings: () => call<Booking[]>('/api/bookings'),
  cancel: (id: string) => call<Booking>('/api/bookings/' + id, 'DELETE'),
  book: (inv: Invitee, start: string) => call<{ booking: { id: string; start: string }; rep: Rep; buffer: boolean }>('/api/bookings', 'POST', { inv, start }),
  rules: (rules: Rule[]) => call<Rule[]>('/api/rules', 'PUT', { rules }),
  leave: (id: string, away: boolean) => call<Rep>('/api/reps/' + id, 'PATCH', { away }),
  buffer: (on: boolean) => call('/api/buffer', 'POST', { on }),
  insights: () => call<Insights>('/api/insights'),
  simulate: () => call<{ rows: SimRow[]; oldGood: number; good: number; total: number }>('/api/simulate'),
  audit: () => call<Audit[]>('/api/audit'),
  reset: () => call('/api/reset', 'POST'),
  scimDeactivate: (id: string) => call<{ 'urn:kestrel:handover': { rep: string; peer: string; accounts: string[]; meetings: number } }>('/scim/v2/Users/' + id, 'PATCH',
    { schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'replace', value: { active: false } }] }, { Authorization: 'Bearer demo-okta-token' }),
}
export const city = (z: string) => z.split('/').pop()!.replace('_', ' ')
export type Insights = {
  weeks: { label: string; owner: number; terr: number; skill: number; rr: number; right: number; total: number }[]
  heat: number[][]
  reps: { id: string; name: string; terr: string; active: boolean; trend: number[] }[]
  kpis: { bookings30: number; rightNow: number; rightBefore: number; reassignsSaved: number }
}
