import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
const Ctx = createContext<(m: string) => void>(() => {})
export const useToast = () => useContext(Ctx)
let seq = 0
export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, set] = useState<{ id: number; m: string; out?: boolean }[]>([])
  const push = useCallback((m: string) => { const id = ++seq; set(x => [...x.slice(-2), { id, m }])
    setTimeout(() => set(x => x.map(i => i.id === id ? { ...i, out: true } : i)), 2480)
    setTimeout(() => set(x => x.filter(i => i.id !== id)), 2600) }, [])
  return <Ctx.Provider value={push}>{children}
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {items.map(i => <div key={i.id} className={cn('flex items-center gap-2 rounded-lg bg-foreground px-4 py-3 text-[13px] text-white shadow-lg', i.out ? 'animate-toast-out' : 'animate-fade-up')}><CheckCircle2 className="size-4 text-emerald-400" />{i.m}</div>)}
    </div></Ctx.Provider>
}
