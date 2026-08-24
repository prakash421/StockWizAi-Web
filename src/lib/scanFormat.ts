// Small pure helpers used by the scan result card. Extracted so we can
// unit-test the classification logic without pulling in React.

export interface EarningsChip {
  label: string;
  className: string;
  urgent: boolean;
}

/**
 * Given an ISO earnings date (or null), returns display metadata for
 * an "Earnings in Nd" chip. Returns null when the date is missing or
 * unparseable. `nowMs` is injectable so tests can pin the clock.
 */
export function earningsChip(
  nextEarningsDate: string | null | undefined,
  nowMs: number = Date.now(),
): EarningsChip | null {
  if (!nextEarningsDate) return null;
  const d = new Date(nextEarningsDate);
  if (isNaN(d.getTime())) return null;
  const days = Math.round((d.getTime() - nowMs) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      label: `Earnings ${nextEarningsDate}`,
      className: "bg-gray-100 text-gray-500",
      urgent: false,
    };
  }
  if (days === 0) {
    return { label: "Earnings today", className: "bg-red-100 text-red-700", urgent: true };
  }
  if (days <= 7) {
    return {
      label: `Earnings in ${days}d`,
      className: "bg-red-100 text-red-700",
      urgent: true,
    };
  }
  if (days <= 14) {
    return {
      label: `Earnings in ${days}d`,
      className: "bg-amber-100 text-amber-700",
      urgent: false,
    };
  }
  return {
    label: `Earnings in ${days}d`,
    className: "bg-gray-100 text-gray-600",
    urgent: false,
  };
}

/**
 * Classify a signed daily-change percent into a Tailwind color class.
 * `null` returns null so the caller can skip rendering the chip.
 */
export function dailyChangeClass(pct: number | null | undefined): string | null {
  if (pct == null) return null;
  if (pct > 0) return "text-green-600";
  if (pct < 0) return "text-red-600";
  return "text-gray-500";
}
