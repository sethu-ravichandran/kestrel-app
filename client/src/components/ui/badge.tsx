import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const v = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors', { variants: { variant: {
  default: 'border-transparent bg-primary text-primary-foreground', outline: 'text-muted-foreground bg-background', success: 'border-success/20 bg-success-bg text-success', warning: 'border-warning/20 bg-warning-bg text-warning', destructive: 'border-destructive/20 bg-red-50 text-destructive' } }, defaultVariants: { variant: 'outline' } })
export const Badge = ({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof v>) => <span className={cn(v({ variant }), className)} {...p} />
