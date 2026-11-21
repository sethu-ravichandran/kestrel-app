import * as React from 'react'
import { cn } from '@/lib/utils'
const base = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary'
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} className={cn(base, className)} {...p} />)
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, r) => <select ref={r} className={cn(base, 'pr-8', className)} {...p} />)
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn('text-[13px] font-medium leading-none', className)} {...p} />
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(240_5%_91%)_37%,hsl(var(--muted))_63%)] bg-[length:400%_100%] animate-shimmer', className)} {...p} />
