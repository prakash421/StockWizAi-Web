"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Briefcase,
  Brain,
  Bell,
  MoreVertical,
  PieChart,
  GraduationCap,
  MessageSquare,
  UserCircle2,
} from "lucide-react";

const tabs = [
  { href: "/", icon: Search, label: "Scan", bg: "bg-indigo-100", activeBg: "bg-indigo-200", text: "text-indigo-700", hover: "hover:bg-indigo-50" },
  { href: "/portfolio", icon: Briefcase, label: "Portfolio", bg: "bg-emerald-100", activeBg: "bg-emerald-200", text: "text-emerald-700", hover: "hover:bg-emerald-50" },
  { href: "/ai-guru", icon: Brain, label: "AI Guru", bg: "bg-purple-100", activeBg: "bg-purple-200", text: "text-purple-700", hover: "hover:bg-purple-50" },
  { href: "/alerts", icon: Bell, label: "Alerts", bg: "bg-amber-100", activeBg: "bg-amber-200", text: "text-amber-700", hover: "hover:bg-amber-50" },
];

const moreLinks = [
  { href: "/sectors", icon: PieChart, label: "Sectors", iconColor: "text-cyan-600" },
  { href: "/learn", icon: GraduationCap, label: "Learn", iconColor: "text-pink-600" },
  { href: "/ask-gemini", icon: MessageSquare, label: "Ask Gemini", iconColor: "text-blue-600" },
  { href: "/account", icon: UserCircle2, label: "Account", iconColor: "text-indigo-600" },
];

export function NavBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = moreLinks.some((m) => pathname === m.href);

  useEffect(() => {
    // Close the More menu when the route changes.
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  const moreBg = moreActive ? "bg-slate-200" : "bg-slate-100";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="max-w-5xl mx-auto flex justify-around md:justify-start md:gap-2 px-2">
        {/* Logo - desktop only */}
        <div className="hidden md:flex items-center mr-8 py-4">
          <span className="text-xl font-bold text-indigo-700">StockWiz AI</span>
        </div>
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-2.5 py-3 px-4 md:px-5 md:py-4 text-sm md:text-base font-semibold transition-all rounded-lg md:rounded-t-lg md:rounded-b-none ${
                active
                  ? `${tab.activeBg} ${tab.text} border-b-3 md:border-b-3 border-current shadow-sm`
                  : `${tab.bg} ${tab.text} ${tab.hover} opacity-80 hover:opacity-100`
              }`}
            >
              <tab.icon size={24} />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* More menu */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2.5 py-3 px-4 md:px-5 md:py-4 text-sm md:text-base font-semibold transition-all rounded-lg md:rounded-t-lg md:rounded-b-none ${moreBg} text-slate-700 hover:bg-slate-200 opacity-80 hover:opacity-100 ${moreActive ? "border-b-3 md:border-b-3 border-current shadow-sm opacity-100" : ""}`}
          >
            <MoreVertical size={24} />
            <span>More</span>
          </button>
          {moreOpen && (
            <div
              role="menu"
              className="absolute bottom-full mb-2 right-0 md:right-auto md:left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            >
              {moreLinks.map((m) => {
                const active = pathname === m.href;
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    role="menuitem"
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <m.icon size={18} className={m.iconColor} />
                    <span>{m.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

