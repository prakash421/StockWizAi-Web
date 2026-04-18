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
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-2.5 py-3 px-4 md:px-5 md:py-4 text-sm md:text-base font-semibold transition-colors ${
                active
                  ? "text-indigo-700 border-t-2 md:border-t-0 md:border-b-3 border-indigo-700 bg-indigo-50 md:rounded-t-lg"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-gray-50 md:rounded-t-lg"
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
