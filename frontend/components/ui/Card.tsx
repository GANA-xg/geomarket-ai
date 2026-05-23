import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md';
};

export function Card({ children, className, hover = false, padding = 'md', ...props }: CardProps) {
  const paddingClass = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5';

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#0F1419] text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.35),0_12px_30px_rgba(0,0,0,0.24)]',
        hover && 'transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]',
        paddingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-3 p-5 pb-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm font-semibold tracking-wide text-slate-200', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardLabel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500', className)} {...props}>
      {children}
    </div>
  );
}

export function Divider({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px w-full bg-white/[0.06]', className)} {...props} />;
}