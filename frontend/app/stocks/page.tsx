"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search, ShieldCheck, SlidersHorizontal, TrendingUp } from "lucide-react";
import { api } from "@/lib/api/client";
import { StockRow } from "@/lib/types";
import { Badge } from "@/components/ui";
import { HoloPanel, LiveOrb, PageConstellation } from "@/components/ui/Spatial";

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [signal, setSignal] = useState("");
  const [buffettOnly, setBuffettOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = (await api.getStocks({
          sector: sector || undefined,
          signal: signal || undefined,
          buffett: buffettOnly ? true : undefined,
        })) as StockRow[];
        if (!cancelled) setStocks(data);
      } catch (err: any) {
        if (!cancelled) {
          setStocks([]);
          setError(err.message || "Failed to load stocks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sector, signal, buffettOnly]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    if (!needle) return stocks;
    return stocks.filter(
      (row) => row.ticker.toLowerCase().includes(needle) || row.company_name.toLowerCase().includes(needle)
    );
  }, [stocks, search]);

  const sectors = useMemo(() => Array.from(new Set(stocks.map((s) => s.sector))).sort(), [stocks]);
  const buyCount = useMemo(() => stocks.filter((stock) => stock.latest_signal === "BUY").length, [stocks]);
  const buffettCount = useMemo(() => stocks.filter((stock) => stock.buffett_qualified).length, [stocks]);
  const averageComposite = useMemo(() => {
    if (!stocks.length) return 0;
    return stocks.reduce((acc, stock) => acc + Number(stock.composite_score || 0), 0) / stocks.length;
  }, [stocks]);

  return (
    <div className="space-y-6 p-5 lg:p-6">
      <PageConstellation
        eyebrow="3D stock intelligence"
        title="Stocks Screener"
        body="Filter the market through live AI signals, Buffett quality gates, and composite quant scoring."
      >
        <div className="flex gap-3">
          <LiveOrb label="Buy" value={String(buyCount)} tone="emerald" />
          <LiveOrb label="Avg" value={averageComposite.toFixed(0)} tone="cyan" />
        </div>
      </PageConstellation>

      <HoloPanel className="p-4" glow="cyan">
        <div className="grid gap-3 lg:grid-cols-[1.4fr,1fr,1fr,auto]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 text-sm text-slate-400">
            <Search size={16} className="text-cyan-200" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Search ticker or company"
              className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600"
            />
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 text-sm text-slate-400">
            <Filter size={16} className="text-orange-200" />
            <select value={sector} onChange={(e) => setSector(e.target.value)} className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none">
              <option value="">All Sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 text-sm text-slate-400">
            <SlidersHorizontal size={16} className="text-cyan-200" />
            <select value={signal} onChange={(e) => setSignal(e.target.value)} className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none">
              <option value="">All Signals</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
              <option value="HOLD">HOLD</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-sm text-emerald-100">
            <input type="checkbox" checked={buffettOnly} onChange={(e) => setBuffettOnly(e.target.checked)} className="accent-emerald-300" />
            Buffett Only
          </label>
        </div>
      </HoloPanel>

      <div className="grid gap-4 md:grid-cols-3">
        <HoloPanel className="p-5" glow="emerald">
          <div className="flex items-center gap-3 text-emerald-200"><ShieldCheck size={17} /> Buffett Qualified</div>
          <div className="mt-3 text-3xl font-semibold">{buffettCount}</div>
          <p className="mt-1 text-sm text-slate-500">Quality names in the current filtered universe.</p>
        </HoloPanel>
        <HoloPanel className="p-5" glow="cyan">
          <div className="flex items-center gap-3 text-cyan-200"><TrendingUp size={17} /> Active Buys</div>
          <div className="mt-3 text-3xl font-semibold">{buyCount}</div>
          <p className="mt-1 text-sm text-slate-500">AI signal count from the latest stock feed.</p>
        </HoloPanel>
        <HoloPanel className="p-5" glow="orange">
          <div className="text-orange-200">Visible Universe</div>
          <div className="mt-3 text-3xl font-semibold">{filtered.length}</div>
          <p className="mt-1 text-sm text-slate-500">{loading ? "Synchronizing market feed..." : "Rows matching active filters."}</p>
        </HoloPanel>
      </div>

      {error ? <HoloPanel className="p-4 text-sm text-rose-200" glow="rose">{error}</HoloPanel> : null}

      <HoloPanel className="overflow-auto" glow="cyan">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.03] text-slate-400">
              <th className="p-3">Ticker</th>
              <th className="p-3">Company</th>
              <th className="p-3">Sector</th>
              <th className="p-3">Price</th>
              <th className="p-3">Buffett</th>
              <th className="p-3">Composite</th>
              <th className="p-3">Signal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">Loading live stock matrix...</td>
              </tr>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No stocks match the current filters.</td>
              </tr>
            ) : null}
            {filtered.map((row) => {
              const composite = row.composite_score ?? 0;
              const compositeClass = composite > 70 ? "text-green-400" : composite >= 40 ? "text-yellow-400" : "text-red-400";
              return (
                <tr key={row.id} className="border-b border-white/[0.06] hover:bg-white/[0.04]">
                  <td className="p-3 font-semibold">{row.ticker}</td>
                  <td className="p-3 text-slate-300">{row.company_name}</td>
                  <td className="p-3 text-slate-400">{row.sector}</td>
                  <td className="p-3">₹{row.current_price?.toFixed?.(2) ?? row.current_price}</td>
                  <td className="p-3">
                    {row.buffett_qualified ? (
                      <Badge variant="bullish">Pass</Badge>
                    ) : (
                      <Badge variant="bearish">Fail</Badge>
                    )}
                  </td>
                  <td className={`p-3 font-semibold ${compositeClass}`}>{composite.toFixed(1)}</td>
                  <td className="p-3"><Badge variant={row.latest_signal === "BUY" ? "buy" : row.latest_signal === "SELL" ? "sell" : "hold"}>{row.latest_signal}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HoloPanel>
    </div>
  );
}
