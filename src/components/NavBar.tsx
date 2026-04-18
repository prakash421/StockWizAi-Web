"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Briefcase, Brain, Bell } from "lucide-react";

const tabs = [
  { href: "/", icon: Search, label: "Scan", bg: "bg-indigo-100", activeBg: "bg-indigo-200", text: "text-indigo-700", hover: "hover:bg-indigo-50" },
  { href: "/portfolio", icon: Briefcase, label: "Portfolio", bg: "bg-emerald-100", activeBg: "bg-emerald-200", text: "text-emerald-700", hover: "hover:bg-emerald-50" },
  { href: "/ai-guru", icon: Brain, label: "AI Guru", bg: "bg-purple-100", activeBg: "bg-purple-200", text: "text-purple-700", hover: "hover:bg-purple-50" },
  { href: "/alerts", icon: Bell, label: "Alerts", bg: "bg-amber-100", activeBg: "bg-amber-200", text: "text-amber-700", hover: "hover:bg-amber-50" },
];

export function NavBar() {
  const pathname = usePathname();

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
      </div>
    </nav>
  );
}
