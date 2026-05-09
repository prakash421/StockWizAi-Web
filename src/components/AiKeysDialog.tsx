"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff, X, KeyRound, AlertTriangle } from "lucide-react";
import {
  AI_ENGINE_LABELS,
  AI_ENGINE_ORDER,
  type AiEngineKey,
  getStoredAiKey,
  setStoredAiKey,
  clearStoredAiKey,
} from "@/lib/aiKeys";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiKeysDialog({ open, onClose }: Props) {
  const [values, setValues] = useState<Record<AiEngineKey, string>>({
    gemini: "",
    openai: "",
    anthropic: "",
    perplexity: "",
    grok: "",
  });
  const [reveal, setReveal] = useState<Record<AiEngineKey, boolean>>({
    gemini: false,
    openai: false,
    anthropic: false,
    perplexity: false,
    grok: false,
  });
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next: Record<AiEngineKey, string> = {
      gemini: "",
      openai: "",
      anthropic: "",
      perplexity: "",
      grok: "",
    };
    for (const k of AI_ENGINE_ORDER) next[k] = getStoredAiKey(k);
    setValues(next);
  }, [open]);

  if (!open) return null;

  const save = () => {
    for (const k of AI_ENGINE_ORDER) setStoredAiKey(k, values[k]);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1200);
  };

  const clearOne = (k: AiEngineKey) => {
    clearStoredAiKey(k);
    setValues((prev) => ({ ...prev, [k]: "" }));
  };

  const clearAll = () => {
    for (const k of AI_ENGINE_ORDER) clearStoredAiKey(k);
    setValues({ gemini: "", openai: "", anthropic: "", perplexity: "", grok: "" });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold">AI Engine API Keys</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              Keys are stored in your browser&apos;s <code>localStorage</code> and sent
              with each AI request. Avoid using these on a shared computer. If a
              key is empty, the server&apos;s own configured key (if any) is used.
            </p>
          </div>

          {AI_ENGINE_ORDER.map((engine) => (
            <div key={engine}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {AI_ENGINE_LABELS[engine]}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={reveal[engine] ? "text" : "password"}
                    value={values[engine]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [engine]: e.target.value }))
                    }
                    placeholder={`Paste your ${AI_ENGINE_LABELS[engine]} key`}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setReveal((prev) => ({ ...prev, [engine]: !prev[engine] }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={reveal[engine] ? "Hide key" : "Show key"}
                  >
                    {reveal[engine] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={() => clearOne(engine)}
                  disabled={!values[engine]}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-red-600 disabled:text-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-2">
          <button
            onClick={clearAll}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="text-xs text-emerald-700">Saved</span>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
