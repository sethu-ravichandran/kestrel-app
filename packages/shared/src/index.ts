// Shared contracts between @kestrel/api and @kestrel/web
export type Rep = { id: string; name: string; email: string; terr: string; tz: string; skills: string[]; langs: string[]; owns: string[]; away: boolean; active: boolean }
export type Rule = { k: string; on: boolean; t: string; d: string }
export type Step = { t: string; r: string; s: 'ok' | 'warn' | 'mut' }
export type Invitee = { email: string; loc: string; tz: string; terr: string; topic: string; lang: string }
export type State = { reps: Rep[]; rules: Rule[]; buffer: boolean; locs: [string, string, string][]; now: string }
export type RouteRes = { rep: Rep | null; trace: Step[]; why: 'owner' | 'rules' | 'none'; slots: string[] }
export type SimRow = { inv: Invitee; old: string; oldFit: boolean; neu: string; neuFit: boolean }
export type Audit = { t: string; who: string; ev: string; d: string }
