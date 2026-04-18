import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return dateStr;
  }
}

export function parseNumber(val: string | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return parseFloat(val.replace(/[^0-9.\-]/g, "")) || 0;
}

export function getRsiColor(rsi: number): string {
  if (rsi < 30) return "text-green-700 bg-green-100";
  if (rsi > 70) return "text-red-700 bg-red-100";
  return "text-gray-600 bg-gray-100";
}

export function getBetaColor(beta: number): string {
  if (beta < 0.8) return "text-blue-700 bg-blue-100";
  if (beta <= 1.2) return "text-gray-600 bg-gray-100";
  if (beta <= 1.8) return "text-orange-700 bg-orange-100";
  return "text-red-700 bg-red-100";
}

export function getIvColor(iv: string): string {
  const num = parseFloat(iv.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "text-gray-600 bg-gray-100";
  if (num < 25) return "text-blue-700 bg-blue-100";
  if (num <= 50) return "text-gray-600 bg-gray-100";
  if (num <= 75) return "text-green-700 bg-green-100";
  return "text-orange-700 bg-orange-100";
}

export function getRecColor(rec: string): string {
  const r = rec.toUpperCase();
  if (r.includes("STRONG BUY")) return "text-green-900 bg-green-200";
  if (r.includes("BUY")) return "text-green-700 bg-green-100";
  if (r.includes("SELL")) return "text-red-700 bg-red-100";
  if (r.includes("HOLD")) return "text-orange-700 bg-orange-100";
  return "text-gray-600 bg-gray-100";
}

export function getBtColor(bt: string): string {
  const val = parseFloat(bt.replace("%", ""));
  if (isNaN(val)) return "text-red-700 bg-red-100";
  if (val >= 80) return "text-green-700 bg-green-100";
  if (val >= 60) return "text-orange-700 bg-orange-100";
  return "text-red-700 bg-red-100";
}

export function getRrColor(rr: number): string {
  if (rr >= 2.0) return "text-green-700 bg-green-100";
  if (rr >= 1.0) return "text-orange-700 bg-orange-100";
  return "text-red-700 bg-red-100";
}
