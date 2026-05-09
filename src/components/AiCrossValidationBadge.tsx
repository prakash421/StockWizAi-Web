"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AiCrossValidation } from "@/lib/aiReasoning";
import {
  pickHighlightReasoning,
  sanitizeReasoning,
} from "@/lib/aiReasoning";

interface Props {
  validation: AiCrossValidation;
}

function consensusColor(consensus: string): string {
  const c = consensus.toUpperCase();
  if (c === "STRONG BUY") return "bg-green-200 text-green-900 border-green-400";
  if (c === "BUY") return "bg-green-100 text-green-800 border-green-300";
  if (c === "HOLD") return "bg-amber-100 text-amber-800 border-amber-300";
  if (c === "SELL" || c === "STRONG SELL")
    return "bg-red-100 text-red-800 border-red-300";
  if (c === "AVOID") return "bg-red-200 text-red-900 border-red-400";
  if (c === "MIXED") return "bg-purple-100 text-purple-800 border-purple-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
}

export function AiCrossValidationBadge({ validation }: Props) {
  const [expanded, setExpanded] = useState(false);
  const highlight = pickHighlightReasoning(validation);
  const cls = consensusColor(validation.consensus);
  const anyReasoning = validation.engines.some(
    (e) => !e.error && e.reasoning.trim().length > 0
  );

  return (
    <div className={`rounded-lg border ${cls} mt-2`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs sm:text-sm"
      >
        <span className="font-semibold">
          🤖 AI: {validation.consensus} · {validation.agreementPct}% agree
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs sm:text-sm">
          <p className="text-gray-700">{validation.summary}</p>
          {highlight && (
            <div className="rounded-md bg-white/70 border border-current/20 px-2.5 py-1.5">
              <p className="font-semibold mb-0.5">
                💡 Why {validation.consensus}? — {highlight.engine}
              </p>
              <p className="text-gray-700">{sanitizeReasoning(highlight.reasoning)}</p>
            </div>
          )}
          <div className="space-y-1">
            {validation.engines.map((e) => (
              <div key={e.engine} className="text-gray-700">
                <span className="font-medium">{e.engine}:</span>{" "}
                {e.error ? (
                  <span className="text-red-600 italic">{e.error}</span>
                ) : (
                  <>
                    <span>
                      {e.verdict} · {e.confidence}
                    </span>
                    {e.reasoning.trim() ? (
                      <span className="block italic text-gray-600 ml-2">
                        &ldquo;{sanitizeReasoning(e.reasoning)}&rdquo;
                      </span>
                    ) : (
                      <span className="block text-gray-400 italic ml-2">
                        (no reasoning provided)
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {!anyReasoning && (
            <p className="text-xs text-gray-500 italic">
              No reasoning returned by any engine.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
