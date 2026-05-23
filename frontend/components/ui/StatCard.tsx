import type { HTMLAttributes } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { Card } from './Card';

type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  value: number | string;
  change?: number;
  suffix?: string;
  kind?: 'currency' | 'percent' | 'number' | 'text';
};

export function StatCard({ title, value, change, suffix, kind = 'number', className, ...props }: StatCardProps) {
  const formattedValue =
    kind === 'currency' && typeof value === 'number' ? formatCurrency(value, true) :
    kind === 'percent' && typeof value === 'number' ? formatPercent(value) :
    value;

  const positive = typeof change === 'number' ? change >= 0 : true;

  return (
    <Card hover className={cn('relative overflow-hidden', className)} {...props}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-100">{formattedValue}{suffix ? <span className="ml-1 text-base text-slate-500">{suffix}</span> : null}</div>
      {typeof change === 'number' ? (
        <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', positive ? 'text-emerald-400' : 'text-rose-400')}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{formatPercent(change)}</span>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
    </Card>
  );
}