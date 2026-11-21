import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const v = cva('inline-flex items-center gap-1.5 text-xs font-medium transition-colors before:size-1.5 before:rounded-full before:bg-current before:content-[""] before:shrink-0', { variants: { variant: {
  default: 'text-foreground', outline: 'text-muted-foreground', success: 'text-success', warning: 'text-warning', destructive: 'text-destructive' } }, defaultVariants: { variant: 'outline' } })
export const Badge = ({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof v>) => <span className={cn(v({ variant }), className)} {...p} />
