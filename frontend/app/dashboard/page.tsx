"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { DashboardStats, LatestSignal } from "@/lib/types";

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Market Overview</h1>
      {error ? <p className="text-red-400 text-sm">{error}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Stocks Screened" value={stats.total_stocks_screened} color="text-blue-400" />
        <StatCard title="Buffett Qualified" value={stats.buffett_qualified_count} color="text-green-400" />
        <StatCard title="Buy Signals" value={stats.active_buy_signals} color="text-emerald-400" />
        <StatCard title="Sell Signals" value={stats.active_sell_signals} color="text-red-400" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-sm">Global Sentiment</p>
        <p className={`text-2xl font-bold ${sentimentClass}`}>{stats.global_sentiment}</p>
        <p className="text-sm text-gray-400 mt-2">News Processed Today: {stats.news_processed_today}</p>
        <p className="text-sm text-gray-400 mt-1">Bullish Sectors: {(stats.top_bullish_sectors || []).join(", ") || "N/A"}</p>
        <p className="text-sm text-gray-400 mt-1">Bearish Sectors: {(stats.top_bearish_sectors || []).join(", ") || "N/A"}</p>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Live Signal Cards</h2>
        {loading ? <p className="text-gray-400">Loading signal cards...</p> : null}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signals.map((signal) => {
            const badgeClass =
              signal.signal_type === "BUY"
                ? "bg-green-900/40 text-green-300 border border-green-800"
                : signal.signal_type === "SELL"
                ? "bg-red-900/40 text-red-300 border border-red-800"
                : "bg-yellow-900/40 text-yellow-300 border border-yellow-800";

            const progress = Math.max(0, Math.min(100, (signal.confidence_score || 0) * 100));

            return (
              <article key={signal.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{signal.ticker} · {signal.company_name}</h3>
                    <p className="text-sm text-gray-400">{signal.sector}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>{signal.signal_type}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Entry: ₹{signal.entry_price_low} - ₹{signal.entry_price_high}</p>
                  <p>Target: ₹{signal.target_price}</p>
                  <p>Stop Loss: ₹{signal.stop_loss}</p>
                  <p>Holding: {signal.hold_duration_days} days</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Confidence</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded">
                    <div className="h-2 bg-emerald-500 rounded" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <p className="text-sm text-gray-300">{signal.reasoning_text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm text-gray-400">{title}</h3>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
