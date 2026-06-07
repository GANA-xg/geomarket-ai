"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, BellRing, CircleDollarSign, Pencil, Plus, Trash2, WifiOff } from "lucide-react";
import { api } from "@/lib/api/client";
import { PortfolioEntry } from "@/lib/types";
import { Badge } from "@/components/ui";
import { HoloPanel, LiveOrb, PageConstellation } from "@/components/ui/Spatial";

interface AlertMessage {
  alert_type: string;
  message: string;
  ticker: string;
  triggered_at: string;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [entryPrice, setEntryPrice] = useState(0);
  const [entryDate, setEntryDate] = useState("");
  const [editing, setEditing] = useState<PortfolioEntry | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editEntryPrice, setEditEntryPrice] = useState(0);
  const [editEntryDate, setEditEntryDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState<"connecting" | "live" | "offline">("connecting");

  async function loadPortfolio() {
    try {
      const data = (await api.getPortfolio()) as PortfolioEntry[];
      setPortfolio(data);
      setError("");
    } catch (err: any) {
      setPortfolio([]);
      setError(err.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPortfolio();

    const interval = window.setInterval(() => {
      loadPortfolio().catch((error) => {
        console.error("Failed to refresh portfolio", error);
      });
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const defaultWsBase =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss://geomarket.ai"
        : "ws://localhost:8000";
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || defaultWsBase;
    const socket = new WebSocket(`${wsBase}/ws/alerts`);

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as AlertMessage;
        setAlerts((prev) => [parsed, ...prev].slice(0, 20));
      } catch {
        // Ignore malformed ws payloads.
      }
    };

    socket.onopen = () => {
      setSocketState("live");
      socket.send("subscribe");
    };

    socket.onerror = () => {
      setSocketState("offline");
    };

    socket.onclose = () => {
      setSocketState("offline");
    };

    return () => {
      socket.close();
    };
  }, []);

  const totalPnl = useMemo(() => portfolio.reduce((acc, row) => acc + row.unrealised_pnl, 0), [portfolio]);
  const exposure = useMemo(() => portfolio.reduce((acc, row) => acc + row.current_price * row.quantity, 0), [portfolio]);
  const winners = useMemo(() => portfolio.filter((row) => row.pnl_pct >= 0).length, [portfolio]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    try {
      await api.createPosition({
        ticker: ticker.toUpperCase(),
        quantity,
        entry_price: entryPrice,
        entry_date: entryDate || undefined,
      });
      setTicker("");
      setQuantity(1);
      setEntryPrice(0);
      setEntryDate("");
      await loadPortfolio();
    } finally {
      setIsBusy(false);
    }
  }

  function onOpenEdit(row: PortfolioEntry) {
    setEditing(row);
    setEditQuantity(row.quantity);
    setEditEntryPrice(row.entry_price);
    setEditEntryDate(row.entry_date ? new Date(row.entry_date).toISOString().slice(0, 10) : "");
  }

  async function onEditSave(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setIsBusy(true);
    try {
      await api.updatePosition(editing.portfolio_id, {
        quantity: editQuantity,
        entry_price: editEntryPrice,
        entry_date: editEntryDate || undefined,
      });
      await loadPortfolio();
      setEditing(null);
    } finally {
      setIsBusy(false);
    }
  }

  async function onDeletePosition(portfolioId: number) {
    setIsBusy(true);
    try {
      await api.deletePosition(portfolioId);
      await loadPortfolio();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-5 lg:p-6">
      <PageConstellation
        eyebrow="Live portfolio cockpit"
        title="AI Portfolio Tracker"
        body="Track exposure, PnL, and live alerts inside a spatial trading control layer."
      >
        <div className="flex gap-3">
          <LiveOrb label="PnL" value={`₹${Math.round(totalPnl)}`} tone={totalPnl >= 0 ? "emerald" : "rose"} />
          <LiveOrb label="Open" value={String(portfolio.length)} tone="cyan" />
        </div>
      </PageConstellation>

      {error ? <HoloPanel className="p-4 text-sm text-rose-200" glow="rose">{error}</HoloPanel> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <HoloPanel className="p-5" glow={totalPnl >= 0 ? "emerald" : "rose"}>
          <div className="flex items-center gap-2 text-slate-400"><CircleDollarSign size={17} /> Open Positions PnL</div>
          <p className={`mt-3 text-4xl font-semibold ${totalPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            ₹{totalPnl.toFixed(2)}
          </p>
        </HoloPanel>
        <HoloPanel className="p-5" glow="cyan">
          <div className="flex items-center gap-2 text-slate-400"><Activity size={17} /> Current Exposure</div>
          <p className="mt-3 text-4xl font-semibold text-cyan-100">₹{exposure.toFixed(0)}</p>
        </HoloPanel>
        <HoloPanel className="p-5" glow="orange">
          <div className="flex items-center gap-2 text-slate-400"><BellRing size={17} /> Alert Stream</div>
          <div className="mt-3 flex items-center gap-3">
            <p className="text-4xl font-semibold text-orange-100">{alerts.length}</p>
            <Badge variant={socketState === "live" ? "bullish" : "bearish"} dot>{socketState}</Badge>
          </div>
        </HoloPanel>
      </div>

      <HoloPanel className="p-4" glow="emerald">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} required placeholder="Ticker (e.g. TCS)" className="h-11 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-300/30" />
          <input aria-label="Quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required className="h-11 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm outline-none focus:border-emerald-300/30" />
          <input aria-label="Entry price" type="number" min={0} step="0.01" value={entryPrice} onChange={(e) => setEntryPrice(Number(e.target.value))} required className="h-11 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm outline-none focus:border-emerald-300/30" />
          <input aria-label="Entry date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-11 rounded-xl border border-white/[0.08] bg-black/30 px-3 text-sm outline-none focus:border-emerald-300/30" />
          <button disabled={isBusy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/15 px-3 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-300/25 disabled:opacity-60">
            <Plus size={16} />
            Add Position
          </button>
        </form>
      </HoloPanel>

      <HoloPanel className="overflow-auto" glow="cyan">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.03] text-slate-400">
              <th className="p-3">Ticker</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Entry</th>
              <th className="p-3">Current</th>
              <th className="p-3">P&L</th>
              <th className="p-3">P&L%</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">Loading portfolio telemetry...</td>
              </tr>
            ) : null}
            {!loading && portfolio.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No open positions yet.</td>
              </tr>
            ) : null}
            {portfolio.map((row) => (
              <tr key={row.portfolio_id} className="border-b border-white/[0.06] hover:bg-white/[0.04]">
                <td className="p-3 font-semibold">{row.ticker}</td>
                <td className="p-3">{row.quantity}</td>
                <td className="p-3">₹{row.entry_price.toFixed(2)}</td>
                <td className="p-3">₹{row.current_price.toFixed(2)}</td>
                <td className={`p-3 font-semibold ${row.unrealised_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ₹{row.unrealised_pnl.toFixed(2)}
                </td>
                <td className={`p-3 font-semibold ${row.pnl_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {row.pnl_pct.toFixed(2)}%
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenEdit(row)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => onDeletePosition(row.portfolio_id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-400/20"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </HoloPanel>

      <HoloPanel className="p-4" glow={socketState === "live" ? "emerald" : "rose"}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Live Alerts</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {socketState === "live" ? <BellRing size={14} className="text-emerald-300" /> : <WifiOff size={14} className="text-rose-300" />}
            {winners} winners
          </div>
        </div>
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div key={`${alert.ticker}-${idx}`} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm">
              <p className="font-semibold">{alert.alert_type} · {alert.ticker}</p>
              <p className="text-slate-300">{alert.message}</p>
              <p className="text-xs text-slate-500">{new Date(alert.triggered_at).toLocaleString()}</p>
            </div>
          ))}
          {alerts.length === 0 ? <p className="text-sm text-slate-500">No live alerts yet.</p> : null}
        </div>
      </HoloPanel>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <form onSubmit={onEditSave} className="w-full max-w-md rounded-2xl border border-white/[0.10] bg-[#071017] p-5 shadow-2xl">
            <h3 className="text-xl font-bold">Edit Position · {editing.ticker}</h3>
            <p className="mt-1 text-sm text-slate-400">Update quantity, entry price, and date.</p>
            <div className="mt-4 grid gap-3">
              <input
                type="number"
                min={1}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
                required
                className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 outline-none"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={editEntryPrice}
                onChange={(e) => setEditEntryPrice(Number(e.target.value))}
                required
                className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 outline-none"
              />
              <input
                type="date"
                value={editEntryDate}
                onChange={(e) => setEditEntryDate(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 outline-none"
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-white/[0.10] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-xl border border-emerald-300/20 bg-emerald-300/15 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/25 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
