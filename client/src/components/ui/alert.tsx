import * as React from 'react'
import { cn } from '@/lib/utils'
const tone = { info: 'bg-accent text-accent-foreground border-primary/15', success: 'bg-success-bg text-success border-success/15', warning: 'bg-warning-bg text-warning border-warning/15', destructive: 'bg-red-50 text-destructive border-destructive/15' }
export const Alert = ({ variant = 'info', className, ...p }: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof tone }) =>
  <div role="status" className={cn('rounded-lg border px-4 py-3 text-sm leading-relaxed animate-fade-up [&_svg]:size-4 [&_svg]:inline [&_svg]:mr-1.5 [&_svg]:-mt-0.5', tone[variant], className)} {...p} />
