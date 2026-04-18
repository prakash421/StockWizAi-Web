"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Briefcase, Brain, Bell } from "lucide-react";

const tabs = [
  { href: "/", icon: Search, label: "Scan" },
  { href: "/portfolio", icon: Briefcase, label: "Portfolio" },
  { href: "/ai-guru", icon: Brain, label: "AI Guru" },
  { href: "/alerts", icon: Bell, label: "Alerts" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:static md:border-t-0 md:border-b z-50">
      <div className="max-w-5xl mx-auto flex justify-around md:justify-start md:gap-1 px-2">
        {/* Logo - desktop only */}
        <div className="hidden md:flex items-center mr-6 py-3">
          <span className="text-lg font-bold text-indigo-700">StockWiz AI</span>
        </div>
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-2 py-2 px-3 md:px-4 md:py-3 text-xs md:text-sm font-medium transition-colors ${
                active
                  ? "text-indigo-700 border-t-2 md:border-t-0 md:border-b-2 border-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
