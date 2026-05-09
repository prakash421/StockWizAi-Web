"use client";

import { X } from "lucide-react";

const RSI_BANDS: { label: string; cls: string }[] = [
  { label: "Oversold (<30)", cls: "bg-blue-100 text-blue-800" },
  { label: "Cooling (30–40)", cls: "bg-blue-100 text-blue-800" },
  { label: "Healthy (40–60)", cls: "bg-green-100 text-green-800" },
  { label: "Climbing (60–70)", cls: "bg-orange-100 text-orange-800" },
  { label: "Overbought (>70)", cls: "bg-red-100 text-red-800" },
];

const BETA_BANDS: { label: string; cls: string }[] = [
  { label: "Defensive (<0.7)", cls: "bg-blue-100 text-blue-800" },
  { label: "Balanced (0.7–1.3)", cls: "bg-green-100 text-green-800" },
  { label: "High (1.3–2.0)", cls: "bg-orange-100 text-orange-800" },
  { label: "Very High (>2.0)", cls: "bg-red-100 text-red-800" },
];

const IV_BANDS: { label: string; cls: string }[] = [
  { label: "Thin (<25%)", cls: "bg-red-100 text-red-800" },
  { label: "Modest (25–50%)", cls: "bg-orange-100 text-orange-800" },
  { label: "Juicy (50–75%)", cls: "bg-green-100 text-green-800" },
  { label: "Rich (>75%)", cls: "bg-green-200 text-green-900" },
];

function Section({
  title,
  bands,
}: {
  title: string;
  bands: { label: string; cls: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1.5">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {bands.map((b) => (
          <span
            key={b.label}
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MetricLegendDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-5 w-full max-w-md space-y-3.5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Color legend</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Colors are biased toward the premium-seller view: green = favourable,
          blue = caution/wait, orange/red = risk.
        </p>
        <Section title="RSI" bands={RSI_BANDS} />
        <Section title="Beta (β) — relative to S&P" bands={BETA_BANDS} />
        <Section title="IV Rank — premium richness" bands={IV_BANDS} />
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
