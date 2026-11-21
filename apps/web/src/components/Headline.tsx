import { cn } from '@/lib/utils'
// One-glance summary that sits at the top of a page: the sentence a skimmer should leave with.
export function Headline({ eyebrow, title, sub, children, className }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return <section className={cn('relative overflow-hidden rounded-2xl bg-[hsl(var(--navy))] p-6 text-white shadow-[0_12px_40px_-16px_rgba(12,16,36,.5)] animate-fade-up [background-image:radial-gradient(90%_140%_at_100%_0%,hsl(226_100%_55%/.35),transparent_60%)]', className)}>
    <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div><p className="text-xs font-medium uppercase tracking-[0.12em] text-white/50">{eyebrow}</p>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[30px]">{title}</h2>
        {sub && <p className="mt-2 max-w-[52ch] text-[13.5px] text-white/65">{sub}</p>}</div>
      {children && <div>{children}</div>}
    </div>
  </section>
}
export const Big = ({ children }: { children: React.ReactNode }) => <span className="text-[hsl(226_100%_72%)]">{children}</span>
