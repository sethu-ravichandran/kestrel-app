import * as React from 'react'
import { cn } from '@/lib/utils'
const tone = { info: '', success: 'border-emerald-200 bg-emerald-50 text-emerald-800', warning: 'border-amber-200 bg-amber-50 text-amber-800', destructive: 'border-red-200 bg-red-50 text-red-700' }
export const Alert = ({ variant = 'info', className, ...p }: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof tone }) =>
  <div role="status" className={cn('rounded-lg border bg-muted/60 px-4 py-3 text-[13px] leading-relaxed animate-fade-up [&_svg]:size-4 [&_svg]:inline [&_svg]:mr-1.5 [&_svg]:-mt-0.5', tone[variant], className)} {...p} />
