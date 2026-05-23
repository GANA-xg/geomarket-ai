import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'neutral' | 'bullish' | 'bearish' | 'ai' | 'buy' | 'sell' | 'hold' | 'high' | 'medium' | 'low';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  dot?: boolean;
};

const variantClassName: Record<BadgeVariant, string> = {
  neutral: 'bg-white/[0.06] text-slate-300 border-white/[0.08]',
  bullish: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  bearish: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  ai: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  buy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  sell: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  hold: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  high: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function Badge({ variant = 'neutral', children, className, dot = false, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        variantClassName[variant],
        className
      )}
      {...props}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', variant === 'bearish' || variant === 'sell' || variant === 'high' ? 'bg-rose-400' : 'bg-emerald-400')} /> : null}
      {children}
    </span>
  );
}

export function LiveBadge({ className }: { className?: string }) {
  return <Badge variant="bullish" dot className={className}>Live</Badge>;
}

export function AIBadge({ className }: { className?: string }) {
  return <Badge variant="ai" className={className}>AI</Badge>;
}