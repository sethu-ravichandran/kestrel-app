import * as React from 'react'
import { cn } from '@/lib/utils'
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('rounded-2xl border border-[#e6e9f2] bg-card shadow-[0_1px_2px_rgba(12,16,36,.04),0_8px_24px_-12px_rgba(12,16,36,.08)] animate-fade-up', className)} {...p} />
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...p} />
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn('text-[15px] font-semibold', className)} {...p} />
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => <p className={cn('text-sm text-muted-foreground leading-relaxed', className)} {...p} />
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('p-5 pt-0', className)} {...p} />
