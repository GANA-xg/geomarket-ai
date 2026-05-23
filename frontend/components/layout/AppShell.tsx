'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Market Command Center', subtitle: 'AI-driven portfolio intelligence and live market context' },
  '/portfolio': { title: 'Portfolio Overview', subtitle: 'Allocation, performance, and risk exposure' },
  '/stocks': { title: 'Stock Intelligence', subtitle: 'Watchlist, technicals, and AI trade signals' },
  '/news': { title: 'Market Intelligence', subtitle: 'News, sentiment, and event monitoring' },
  '/map': { title: 'Geo Map', subtitle: 'Country-level market and macro exposure' },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] || PAGE_META['/dashboard'];

  return (
    <div className="flex min-h-screen bg-[#080C10] text-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}