"use client";
import { MessageSquare } from "lucide-react";
import { GeminiChatPanel } from "@/components/GeminiChatPanel";

export default function AskGeminiPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] -mt-2">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={22} className="text-blue-600" />
        <h1 className="text-lg font-bold">Ask Gemini</h1>
      </div>
      <div className="flex-1 min-h-0 border border-gray-200 rounded-xl overflow-hidden bg-white">
        <GeminiChatPanel showContextBanner />
      </div>
    </div>
  );
}
