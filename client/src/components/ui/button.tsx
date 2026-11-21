import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[.97] [&_svg]:size-4 [&_svg]:shrink-0',
  { variants: {
      variant: { default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow', outline: 'border border-input bg-background shadow-sm hover:bg-muted', secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80', ghost: 'hover:bg-muted', destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
      size: { default: 'h-9 px-4', sm: 'h-8 px-3 text-xs', lg: 'h-10 px-6', icon: 'h-8 w-8' } },
    defaultVariants: { variant: 'default', size: 'default' } })
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...p }, ref) =>
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...p} />)
