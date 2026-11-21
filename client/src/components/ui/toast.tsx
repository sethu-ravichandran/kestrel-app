import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
const Ctx = createContext<(m: string) => void>(() => {})
export const useToast = () => useContext(Ctx)
export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, set] = useState<{ id: number; m: string }[]>([])
  const push = useCallback((m: string) => { const id = Date.now(); set(x => [...x, { id, m }]); setTimeout(() => set(x => x.filter(i => i.id !== id)), 2600) }, [])
  return <Ctx.Provider value={push}>{children}
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {items.map(i => <div key={i.id} className="flex items-center gap-2 rounded-[5px] bg-foreground px-4 py-2.5 font-mono text-xs text-background animate-in slide-in-from-bottom-4 fade-in duration-300"><CheckCircle2 className="size-4 text-[hsl(221_100%_70%)]" />{i.m}</div>)}
    </div></Ctx.Provider>
}
