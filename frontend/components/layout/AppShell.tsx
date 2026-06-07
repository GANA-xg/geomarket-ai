'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SpatialField } from '@/components/landing/SpatialField';

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

  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#05080C] text-slate-100">
      <SpatialField intensity={pathname === '/map' ? 'active' : 'quiet'} />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_86%_4%,rgba(249,115,22,0.10),transparent_26%),linear-gradient(180deg,rgba(5,8,12,0.28),rgba(5,8,12,0.96))]" />
      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
