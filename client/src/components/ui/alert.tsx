import * as React from 'react'
import { cn } from '@/lib/utils'
const tone = { info: 'border-l-foreground', success: 'border-l-success', warning: 'border-l-warning', destructive: 'border-l-destructive text-destructive' }
export const Alert = ({ variant = 'info', className, ...p }: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof tone }) =>
  <div role="status" className={cn('border-0 border-l-2 bg-secondary/60 pl-4 pr-3 py-3 text-[13px] leading-relaxed animate-fade-up [&_svg]:size-4 [&_svg]:inline [&_svg]:mr-1.5 [&_svg]:-mt-0.5', tone[variant], className)} {...p} />
