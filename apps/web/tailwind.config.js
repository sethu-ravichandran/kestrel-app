import animate from 'tailwindcss-animate'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))', background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
      primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
      secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
      muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
      accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      success: { DEFAULT: 'hsl(var(--success))', bg: 'hsl(var(--success-bg))' }, warning: { DEFAULT: 'hsl(var(--warning))', bg: 'hsl(var(--warning-bg))' },
      card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' } },
    borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    transitionDuration: { fast: '120ms', base: '180ms', slow: '240ms' },
    transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)', in: 'cubic-bezier(.4,0,1,1)' },
    keyframes: { 'slide-l': { from: { opacity: 0, transform: 'translateX(12px)' }, to: { opacity: 1, transform: 'none' } }, 'slide-r': { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'none' } }, 'toast-out': { to: { opacity: 0, transform: 'translateY(6px) scale(.98)' } }, pop: { '0%': { opacity: 0, transform: 'scale(.6)' }, '60%': { opacity: 1, transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } }, draw: { from: { strokeDashoffset: 24 }, to: { strokeDashoffset: 0 } }, 'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } }, shimmer: { '0%': { backgroundPosition: '100% 50%' }, '100%': { backgroundPosition: '0 50%' } } },
    animation: { 'fade-up': 'fade-up .24s cubic-bezier(.2,.8,.2,1) both', shimmer: 'shimmer 1.2s ease infinite', 'slide-l': 'slide-l .24s cubic-bezier(.2,.8,.2,1) both', 'slide-r': 'slide-r .24s cubic-bezier(.2,.8,.2,1) both', 'toast-out': 'toast-out .12s cubic-bezier(.4,0,1,1) forwards', pop: 'pop .24s cubic-bezier(.2,.8,.2,1) both', draw: 'draw .24s .12s cubic-bezier(.2,.8,.2,1) both' },
  } },
  plugins: [animate],
}
