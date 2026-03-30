"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { PortfolioEntry } from "@/lib/types";

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

  async function loadPortfolio() {
    const data = (await api.getPortfolio()) as PortfolioEntry[];
    setPortfolio(data);
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
      socket.send("subscribe");
    };

    return () => {
      socket.close();
    };
  }, []);

  const totalPnl = useMemo(() => portfolio.reduce((acc, row) => acc + row.unrealised_pnl, 0), [portfolio]);

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Portfolio Tracker</h1>

      <div className="bg-gradient-to-br from-emerald-900/40 to-gray-900 border border-emerald-900/50 rounded-xl p-6 shadow-lg">
        <h2 className="text-gray-400 font-medium text-lg">Open Positions PnL</h2>
        <p className={`text-4xl font-bold mt-2 ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
          ₹{totalPnl.toFixed(2)}
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input value={ticker} onChange={(e) => setTicker(e.target.value)} required placeholder="Ticker (e.g. TCS)" className="bg-gray-950 border border-gray-700 rounded px-3 py-2" />
        <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required className="bg-gray-950 border border-gray-700 rounded px-3 py-2" />
        <input type="number" min={0} step="0.01" value={entryPrice} onChange={(e) => setEntryPrice(Number(e.target.value))} required className="bg-gray-950 border border-gray-700 rounded px-3 py-2" />
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="bg-gray-950 border border-gray-700 rounded px-3 py-2" />
        <button disabled={isBusy} className="bg-emerald-600 hover:bg-emerald-500 rounded px-3 py-2 font-semibold disabled:opacity-60">Add Position</button>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-950 border-b border-gray-800 text-gray-400">
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
            {portfolio.map((row) => (
              <tr key={row.portfolio_id} className="border-b border-gray-800/50">
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
                      className="rounded border border-blue-500/50 bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-500/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeletePosition(row.portfolio_id)}
                      disabled={isBusy}
                      className="rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Live Alerts</h2>
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div key={`${alert.ticker}-${idx}`} className="border border-gray-700 rounded p-3 text-sm">
              <p className="font-semibold">{alert.alert_type} · {alert.ticker}</p>
              <p className="text-gray-300">{alert.message}</p>
              <p className="text-xs text-gray-500">{new Date(alert.triggered_at).toLocaleString()}</p>
            </div>
          ))}
          {alerts.length === 0 ? <p className="text-sm text-gray-500">No live alerts yet.</p> : null}
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <form onSubmit={onEditSave} className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <h3 className="text-xl font-bold">Edit Position · {editing.ticker}</h3>
            <p className="mt-1 text-sm text-gray-400">Update quantity, entry price, and date.</p>
            <div className="mt-4 grid gap-3">
              <input
                type="number"
                min={1}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
                required
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={editEntryPrice}
                onChange={(e) => setEditEntryPrice(Number(e.target.value))}
                required
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2"
              />
              <input
                type="date"
                value={editEntryDate}
                onChange={(e) => setEditEntryDate(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2"
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
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
