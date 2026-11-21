import { cn } from '@/lib/utils'
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { v: T; label: React.ReactNode }[] }) {
  return <div role="tablist" className="inline-flex h-14 items-stretch gap-6 text-muted-foreground">
    {items.map(i => <button key={i.v} role="tab" aria-selected={value === i.v} onClick={() => onChange(i.v)}
      className={cn('relative inline-flex items-center text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:text-accent [&_svg]:hidden after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:transition-colors',
        value === i.v ? 'text-foreground after:bg-accent' : 'hover:text-foreground after:bg-transparent')}>{i.label}</button>)}
  </div>
}
