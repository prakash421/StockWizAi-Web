"use client";
import { useState, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";

interface AlertItem {
  id: number;
  title: string;
  body: string;
  time: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stockwiz_alerts");
      if (saved) {
        try { setAlerts(JSON.parse(saved)); } catch { /* ignore */ }
      }
    }
  }, []);

  const clearAll = () => {
    setAlerts([]);
    localStorage.removeItem("stockwiz_alerts");
  };

  const removeAlert = (id: number) => {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    localStorage.setItem("stockwiz_alerts", JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={24} className="text-indigo-600" />
          <h1 className="text-lg font-bold">Alerts</h1>
        </div>
        {alerts.length > 0 && (
          <button onClick={clearAll} className="text-xs text-red-600 hover:underline">Clear all</button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-sm">No alerts yet.</p>
          <p className="text-gray-300 text-xs mt-1">
            Scan results and notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
              <Bell size={16} className="text-indigo-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.body}</p>
                <p className="text-xs text-gray-300 mt-1">{a.time}</p>
              </div>
              <button onClick={() => removeAlert(a.id)} className="text-gray-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
