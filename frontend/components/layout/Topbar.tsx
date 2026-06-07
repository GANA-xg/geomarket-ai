'use client';

import { Search, Bell, ShieldCheck } from 'lucide-react';
import { LiveBadge, AIBadge } from '@/components/ui';

type TopbarProps = {
  title: string;
  subtitle: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="border-b border-white/[0.08] bg-[#061018]/76 px-5 py-4 shadow-[0_16px_70px_rgba(0,0,0,0.20)] backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-100 lg:text-xl">{title}</h1>
            <LiveBadge />
          </div>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-slate-500">
            <Search size={14} />
            <span>Search</span>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200">
            <Bell size={16} />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-300/15">
            <ShieldCheck size={14} />
            Protected
          </button>
          <AIBadge />
        </div>
      </div>
    </header>
  );
}
