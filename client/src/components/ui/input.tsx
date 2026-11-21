import * as React from 'react'
import { cn } from '@/lib/utils'
const base = 'flex h-9 w-full rounded-[5px] border border-input bg-white/60 px-3 text-[13.5px] transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-accent'
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} className={cn(base, className)} {...p} />)
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, r) => <select ref={r} className={cn(base, 'pr-8', className)} {...p} />)
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn('font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground leading-none', className)} {...p} />
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(240_5%_91%)_37%,hsl(var(--muted))_63%)] bg-[length:400%_100%] animate-shimmer', className)} {...p} />
