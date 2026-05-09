"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { buildScanContext, useLastScanContext } from "@/lib/scanContext";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface Props {
  /** Compact mode trims fonts + padding for the split-screen overlay. */
  compact?: boolean;
  /** Show context-share toggle inline (full-screen mode). */
  showContextBanner?: boolean;
  /** External control for the include-context toggle (compact header version). */
  includeScanContext?: boolean;
  onIncludeScanContextChange?: (v: boolean) => void;
}

export function GeminiChatPanel({
  compact = false,
  showContextBanner = true,
  includeScanContext: controlledInclude,
  onIncludeScanContextChange,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [internalInclude, setInternalInclude] = useState(true);
  const includeScanContext = controlledInclude ?? internalInclude;
  const setIncludeScanContext = (v: boolean) => {
    if (onIncludeScanContextChange) onIncludeScanContextChange(v);
    else setInternalInclude(v);
  };
  const ctx = useLastScanContext();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setLastError(null);
    const historySnapshot = [...messages];
    setMessages([...historySnapshot, { role: "user", text }]);
    setSending(true);
    try {
      const systemContext = buildScanContext(includeScanContext);
      const resp = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: historySnapshot, message: text, systemContext }),
      });
      const json = (await resp.json()) as { text?: string; error?: string };
      if (!resp.ok || json.error) {
        setLastError(json.error || `HTTP ${resp.status}`);
      } else if (json.text) {
        setMessages((prev) => [...prev, { role: "model", text: json.text! }]);
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setLastError(null);
  };

  const fontBody = compact ? "text-xs" : "text-sm";
  const fontSmall = compact ? "text-[10px]" : "text-xs";
  const inputCls = compact
    ? "px-2 py-1.5 text-xs"
    : "px-3 py-2 text-sm";
  const sendSize = compact ? "w-9 h-9" : "w-10 h-10";

  return (
    <div className="flex flex-col h-full min-h-0">
      {showContextBanner && (
        <div className={`flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100 ${fontSmall}`}>
          <label className="flex items-center gap-2 text-indigo-800 cursor-pointer">
            <input
              type="checkbox"
              checked={includeScanContext}
              onChange={(e) => setIncludeScanContext(e.target.checked)}
              className="rounded"
            />
            Share scan context ({ctx.results.length} results)
          </label>
          <button onClick={clear} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-white min-h-0">
        {messages.length === 0 && !sending && (
          <p className={`${fontSmall} text-gray-400 italic`}>
            Ask Gemini about your scan results — &ldquo;Why is NVDA flagged?&rdquo;, &ldquo;Compare the BUY-rated names&rdquo;, etc.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${fontBody} px-3 py-2 rounded-lg ${
              m.role === "user"
                ? "bg-indigo-100 text-indigo-900 ml-6"
                : "bg-gray-100 text-gray-800 mr-6"
            } whitespace-pre-wrap break-words`}
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <div className={`${fontSmall} text-gray-500 flex items-center gap-1`}>
            <Loader2 size={12} className="animate-spin" /> Gemini is thinking...
          </div>
        )}
        {lastError && (
          <div className={`${fontSmall} flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-1.5 rounded`}>
            <AlertTriangle size={12} />
            <span className="flex-1">{lastError}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 px-2 py-2 border-t border-gray-200 bg-white">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={compact ? 2 : 3}
          placeholder="Ask Gemini about these results..."
          className={`flex-1 border border-gray-300 rounded-lg ${inputCls} resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className={`${sendSize} flex items-center justify-center bg-indigo-600 text-white rounded-lg disabled:bg-indigo-300 hover:bg-indigo-700 transition`}
          aria-label="Send message"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
