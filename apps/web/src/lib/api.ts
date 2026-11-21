import type { Rep, Rule, Step, Invitee, State, RouteRes, SimRow, Audit } from '@kestrel/shared'
export type { Rep, Rule, Step, Invitee, State, RouteRes, SimRow, Audit }
async function call<T>(p: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const r = await fetch(p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json(); if (!r.ok) throw new Error(j.error || String(r.status)); return j
}
export const api = {
  state: () => call<State>('/api/state'),
  route: (inv: Invitee) => call<RouteRes>('/api/route', 'POST', inv),
  book: (inv: Invitee, start: string) => call<{ booking: { id: string; start: string }; rep: Rep; buffer: boolean }>('/api/bookings', 'POST', { inv, start }),
  rules: (rules: Rule[]) => call<Rule[]>('/api/rules', 'PUT', { rules }),
  leave: (id: string, away: boolean) => call<Rep>('/api/reps/' + id, 'PATCH', { away }),
  buffer: (on: boolean) => call('/api/buffer', 'POST', { on }),
  simulate: () => call<{ rows: SimRow[]; oldGood: number; good: number; total: number }>('/api/simulate'),
  audit: () => call<Audit[]>('/api/audit'),
  reset: () => call('/api/reset', 'POST'),
  scimDeactivate: (id: string) => call<{ 'urn:kestrel:handover': { rep: string; peer: string; accounts: string[]; meetings: number } }>('/scim/v2/Users/' + id, 'PATCH',
    { schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'replace', value: { active: false } }] }, { Authorization: 'Bearer demo-okta-token' }),
}
export const city = (z: string) => z.split('/').pop()!.replace('_', ' ')