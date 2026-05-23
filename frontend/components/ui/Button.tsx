import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500/15 text-blue-300 border-blue-500/20 hover:bg-blue-500/25',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white border-transparent',
  outline: 'bg-white/[0.03] text-slate-200 border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06]',
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variantClassName[variant],
        sizeClassName[size],
        className
      )}
      {...props}
    />
  );
}