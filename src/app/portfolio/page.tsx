"use client";
import { useState, useEffect, useCallback } from "react";
import { getPositions, addPosition, closePosition, removePosition } from "@/lib/api";
import type { ActivePosition, ClosedPosition, TradeEntry, HealthResponse } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Loader2, Plus, X, Trash2, DollarSign, AlertTriangle } from "lucide-react";

export default function PortfolioPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showClose, setShowClose] = useState<ActivePosition | null>(null);
  const [tab, setTab] = useState<"active" | "closed">("active");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getPositions();
      setData(resp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = data?.active_positions ?? [];
  const closed = data?.closed_positions ?? [];

  return (
    <div className="space-y-4">
      {/* Tabs + Add*/}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab("active")}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === "active" ? "bg-white shadow text-indigo-700" : "text-gray-500"}`}>
            Active ({active.length})
          </button>
          <button onClick={() => setTab("closed")}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition ${tab === "closed" ? "bg-white shadow text-indigo-700" : "text-gray-500"}`}>
            Closed ({closed.length})
          </button>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          <Plus size={18} />
        </button>
      </div>

      {/* Capital Health */}
      {data?.capital_health && (
        <div className="bg-indigo-50 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-indigo-700 font-medium">Committed Capital</span>
          <span className="font-bold text-indigo-900">${data.capital_health.committed.toLocaleString()}</span>
        </div>
      )}
      {data?.performance && (
        <div className="bg-green-50 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-green-700 font-medium">Monthly Realized</span>
          <span className="font-bold text-green-900">${data.performance.monthly_realized.toLocaleString()} ({data.performance.monthly_goal_progress})</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-800 rounded-lg text-sm">
          <AlertTriangle size={16} /><span className="flex-1">{error}</span>
          <button onClick={load} className="text-red-600 underline text-xs">Retry</button>
        </div>
      )}

      {/* Active */}
      {tab === "active" && !loading && (
        <div className="space-y-2">
          {active.length === 0 && !error && (
            <p className="text-center text-gray-400 py-8 text-sm">No active positions. Tap + to add one.</p>
          )}
          {active.map((p) => (
            <div key={p.id ?? p.ticker + p.strike} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{p.ticker}</span>
                <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{p.strategy}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>Strike <span className="font-medium text-gray-700">${p.strike}</span></div>
                <div>Contracts <span className="font-medium text-gray-700">{p.contracts}</span></div>
                <div>Premium <span className="font-medium text-gray-700">${p.entry_premium.toFixed(2)}</span></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">Exp: {formatDate(p.expiry)}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowClose(p)}
                  className="flex items-center gap-1 px-3 py-1 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
                  <DollarSign size={12} /> Close
                </button>
                {p.id != null && (
                  <button onClick={async () => { await removePosition(p.id!); load(); }}
                    className="flex items-center gap-1 px-3 py-1 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Closed */}
      {tab === "closed" && !loading && (
        <div className="space-y-2">
          {closed.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No closed positions yet.</p>
          )}
          {closed.map((p, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{p.ticker}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{p.strategy}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>Strike <span className="font-medium text-gray-700">${p.strike}</span></div>
                <div>Entry <span className="font-medium text-gray-700">${p.entry_premium.toFixed(2)}</span></div>
                <div>Exit <span className="font-medium text-gray-700">${p.exit_price?.toFixed(2) ?? "—"}</span></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">Closed: {formatDate(p.exit_date)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add Position Dialog */}
      {showAdd && <AddPositionDialog onClose={() => setShowAdd(false)} onSave={async (t) => { await addPosition(t); setShowAdd(false); load(); }} />}

      {/* Close Position Dialog */}
      {showClose && <ClosePositionDialog position={showClose} onClose={() => setShowClose(null)} onConfirm={async (exitPrice) => {
        if (showClose.id != null) {
          await closePosition(showClose.id, exitPrice, new Date().toISOString().slice(0, 10));
          setShowClose(null);
          load();
        }
      }} />}
    </div>
  );
}

function AddPositionDialog({ onClose, onSave }: { onClose: () => void; onSave: (t: TradeEntry) => void }) {
  const [form, setForm] = useState({
    ticker: "", strike: "", expiry: "", entry_premium: "", contracts: "1", strategy: "CSP"
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const t: TradeEntry = {
      ticker: form.ticker.toUpperCase(),
      strike: parseFloat(form.strike) || 0,
      expiry: form.expiry,
      trigger_price: parseFloat(form.strike) || 0,
      entry_premium: parseFloat(form.entry_premium) || 0,
      contracts: parseInt(form.contracts) || 1,
      strategy: form.strategy,
      is_call: form.strategy.includes("call") ? 1 : 0,
      is_buy: form.strategy === "LEAPS" ? 1 : 0,
    };
    onSave(t);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Add Position</h2><button onClick={onClose}><X size={20} /></button></div>
        <input placeholder="Ticker" value={form.ticker} onChange={(e) => set("ticker", e.target.value.toUpperCase())} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <select value={form.strategy} onChange={(e) => set("strategy", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
          <option>CSP</option><option>Diagonal</option><option>Vertical</option><option>LEAPS</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Strike" value={form.strike} onChange={(e) => set("strike", e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Premium" value={form.entry_premium} onChange={(e) => set("entry_premium", e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <input type="date" placeholder="Expiry" value={form.expiry} onChange={(e) => set("expiry", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Contracts" value={form.contracts} onChange={(e) => set("contracts", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <button onClick={save} className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium">Save</button>
      </div>
    </div>
  );
}

function ClosePositionDialog({ position, onClose, onConfirm }: { position: ActivePosition; onClose: () => void; onConfirm: (exitPrice: number) => void }) {
  const [exitPrice, setExitPrice] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Close {position.ticker}</h2>
        <p className="text-sm text-gray-500">Entry: ${position.entry_premium.toFixed(2)} | Strike: ${position.strike}</p>
        <input placeholder="Exit Price" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => onConfirm(parseFloat(exitPrice) || 0)}
          className="w-full bg-green-600 text-white rounded-lg py-2 font-medium">Confirm Close</button>
      </div>
    </div>
  );
}
