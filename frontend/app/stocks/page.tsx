"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { StockRow } from "@/lib/types";

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [signal, setSignal] = useState("");
  const [buffettOnly, setBuffettOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = (await api.getStocks({
        sector: sector || undefined,
        signal: signal || undefined,
        buffett: buffettOnly ? true : undefined,
      })) as StockRow[];
      if (!cancelled) setStocks(data);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
        <h1 className="text-3xl font-bold">Stocks Screener</h1>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search ticker/company"
            className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm"
          />
          <select value={sector} onChange={(e) => setSector(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm">
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={signal} onChange={(e) => setSignal(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm">
            <option value="">All Signals</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="HOLD">HOLD</option>
          </select>
          <label className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-800 rounded bg-gray-900">
            <input type="checkbox" checked={buffettOnly} onChange={(e) => setBuffettOnly(e.target.checked)} />
            Buffett Only
          </label>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-950 border-b border-gray-800 text-gray-400">
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
            {filtered.map((row) => {
              const composite = row.composite_score ?? 0;
              const compositeClass = composite > 70 ? "text-green-400" : composite >= 40 ? "text-yellow-400" : "text-red-400";
              return (
                <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 font-semibold">{row.ticker}</td>
                  <td className="p-3 text-gray-300">{row.company_name}</td>
                  <td className="p-3 text-gray-400">{row.sector}</td>
                  <td className="p-3">₹{row.current_price?.toFixed?.(2) ?? row.current_price}</td>
                  <td className="p-3">
                    {row.buffett_qualified ? (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-green-900/40 text-green-300 border border-green-800">✓</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-900/40 text-red-300 border border-red-800">✗</span>
                    )}
                  </td>
                  <td className={`p-3 font-semibold ${compositeClass}`}>{composite.toFixed(1)}</td>
                  <td className="p-3">{row.latest_signal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
