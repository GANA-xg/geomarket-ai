"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Brain, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/lib/api/client";
import { DashboardStats, LatestSignal } from "@/lib/types";
import { Badge, Card, CardHeader, CardTitle, StatCard } from "@/components/ui";
import { cn, formatPercent } from "@/lib/utils";

const emptyStats: DashboardStats = {
  total_stocks_screened: 0,
  buffett_qualified_count: 0,
  active_buy_signals: 0,
  active_sell_signals: 0,
  news_processed_today: 0,
  top_bullish_sectors: [],
  top_bearish_sectors: [],
  global_sentiment: "NEUTRAL",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [signals, setSignals] = useState<LatestSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [statsData, signalData] = await Promise.all([api.getDashboardStats(), api.getLatestSignals()]);
        if (cancelled) return;
        setStats(statsData as DashboardStats);
        setSignals(signalData as LatestSignal[]);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sentimentClass = useMemo(() => {
    if (stats.global_sentiment === "POSITIVE") return "text-green-400";
    if (stats.global_sentiment === "NEGATIVE") return "text-red-400";
    return "text-yellow-400";
  }, [stats.global_sentiment]);

  return (
    <div className="space-y-6 p-5 lg:p-6">
      <Card className="relative overflow-hidden border-blue-500/15 bg-gradient-to-r from-blue-500/10 via-[#0F1419] to-violet-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="ai">Daily Brief</Badge>
              <Badge variant={stats.global_sentiment === 'POSITIVE' ? 'bullish' : stats.global_sentiment === 'NEGATIVE' ? 'bearish' : 'neutral'}>
                {stats.global_sentiment}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
                <Brain size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100 lg:text-3xl">Market Overview</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Live screening, AI signals, and macro sentiment for the current market session.
                </p>
              </div>
            </div>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">News processed today: {stats.news_processed_today}</span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">Bullish sectors: {(stats.top_bullish_sectors || []).join(', ') || 'N/A'}</span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">Bearish sectors: {(stats.top_bearish_sectors || []).join(', ') || 'N/A'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 lg:text-right">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">AI coverage</div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">Real-time alerts</div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">Macro context</div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">Portfolio view</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Stocks Screened" value={stats.total_stocks_screened} kind="number" />
        <StatCard title="Buffett Qualified" value={stats.buffett_qualified_count} kind="number" />
        <StatCard title="Buy Signals" value={stats.active_buy_signals} kind="number" />
        <StatCard title="Sell Signals" value={stats.active_sell_signals} kind="number" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-blue-300" />
              <CardTitle>Live Signal Cards</CardTitle>
            </div>
            <span className="text-xs text-slate-500">{loading ? 'Loading...' : `${signals.length} active`}</span>
          </CardHeader>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {signals.map((signal) => {
              const progress = Math.max(0, Math.min(100, signal.confidence_score * 100));
              const isBuy = signal.signal_type === 'BUY';
              const isSell = signal.signal_type === 'SELL';

              return (
                <article key={signal.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{signal.ticker} · {signal.company_name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{signal.sector}</p>
                    </div>
                    <Badge variant={isBuy ? 'buy' : isSell ? 'sell' : 'hold'}>{signal.signal_type}</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <p>Entry: ₹{signal.entry_price_low} - ₹{signal.entry_price_high}</p>
                    <p>Target: ₹{signal.target_price}</p>
                    <p>Stop Loss: ₹{signal.stop_loss}</p>
                    <p>Holding: {signal.hold_duration_days} days</p>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                      <span>Confidence</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06]">
                      <div
                        className={cn('h-2 rounded-full', isBuy ? 'bg-emerald-400' : isSell ? 'bg-rose-400' : 'bg-amber-400')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{signal.reasoning_text}</p>
                </article>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-300" />
              <CardTitle>Sentiment Snapshot</CardTitle>
            </div>
          </CardHeader>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Global sentiment</div>
              <div className={`mt-2 text-2xl font-bold ${sentimentClass}`}>{stats.global_sentiment}</div>
              <p className="mt-2 text-slate-400">AI models are processing {stats.news_processed_today} news items today.</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-slate-200">
                <TrendingUp size={14} className="text-emerald-300" />
                Bullish sectors
              </div>
              <p className="mt-2 text-slate-400">{(stats.top_bullish_sectors || []).join(', ') || 'N/A'}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-slate-200">
                <TrendingDown size={14} className="text-rose-300" />
                Bearish sectors
              </div>
              <p className="mt-2 text-slate-400">{(stats.top_bearish_sectors || []).join(', ') || 'N/A'}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-amber-500/10 p-4 text-amber-100">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} />
                Monitoring active
              </div>
              <p className="mt-2 text-sm text-amber-50/80">Signals are refreshed as market and news data updates.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

