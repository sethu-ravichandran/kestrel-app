import { cn } from '@/lib/utils'
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { v: T; label: React.ReactNode }[] }) {
  return <div role="tablist" className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground">
    {items.map(i => <button key={i.v} role="tab" aria-selected={value === i.v} onClick={() => onChange(i.v)}
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4', value === i.v ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground')}>{i.label}</button>)}
  </div>
}
