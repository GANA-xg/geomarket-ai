'use client';

import { Search, Bell, ShieldCheck } from 'lucide-react';
import { LiveBadge, AIBadge } from '@/components/ui';

type TopbarProps = {
  title: string;
  subtitle: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="border-b border-white/[0.06] bg-[#080C10]/90 px-5 py-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-100 lg:text-xl">{title}</h1>
            <LiveBadge />
          </div>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-500">
            <Search size={14} />
            <span>Search</span>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200">
            <Bell size={16} />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-500/15">
            <ShieldCheck size={14} />
            Protected
          </button>
          <AIBadge />
        </div>
      </div>
    </header>
  );
}