'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, Newspaper, Map, BriefcaseBusiness, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: BriefcaseBusiness },
  { href: '/stocks', label: 'Stocks', icon: LineChart },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/map', label: 'Map', icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-white/[0.06] bg-[#0A0F14] px-4 py-5 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-violet-500/10 text-blue-300 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide text-slate-100">GeoMarket AI</div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Market control room</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'border border-blue-500/15 bg-blue-500/10 text-blue-200'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
              )}
            >
              <Icon size={16} className={active ? 'text-blue-300' : 'text-slate-500'} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-slate-300">
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">System status</div>
        <div className="mt-2 font-semibold text-emerald-300">All feeds operational</div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Live market data, news, and portfolio updates are connected.</p>
      </div>
    </aside>
  );
}