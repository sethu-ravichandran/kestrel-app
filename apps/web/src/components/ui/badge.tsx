import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const v = cva('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', { variants: { variant: {
  default: 'bg-blue-50 text-blue-700 ring-blue-600/20', outline: 'bg-gray-50 text-gray-600 ring-gray-500/10', success: 'bg-green-50 text-green-700 ring-green-600/20', warning: 'bg-amber-50 text-amber-700 ring-amber-600/20', destructive: 'bg-red-50 text-red-700 ring-red-600/10' } }, defaultVariants: { variant: 'outline' } })
export const Badge = ({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof v>) => <span className={cn(v({ variant }), className)} {...p} />
