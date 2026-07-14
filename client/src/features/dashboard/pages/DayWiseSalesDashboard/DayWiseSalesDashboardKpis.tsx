import { ArrowUpRight } from "lucide-react";
import type { KpiMetrics } from "./types";

interface KpiCardsProps {
  kpis: KpiMetrics;
  growthIsPositive: boolean;
}

export function DayWiseSalesDashboardKpis({ kpis, growthIsPositive }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
      <div className="px-6 py-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          FY 2026-27 YTD
        </p>
        <p className="text-2xl font-bold tracking-tight text-emerald-600">
          ₹{kpis.fy27YTD.toFixed(2)} <span className="text-sm font-medium text-emerald-500">Cr</span>
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
      </div>

      <div className="px-6 py-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          SAME PERIOD FY 2025-26
        </p>
        <p className="text-2xl font-bold tracking-tight text-slate-500">
          ₹{kpis.fy26Same.toFixed(2)} <span className="text-sm font-medium text-slate-400">Cr</span>
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-full rounded-full bg-slate-300" />
        </div>
      </div>

      <div className="px-6 py-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          GROWTH VS PREV FY
        </p>
        <div className="flex items-center gap-1.5">
          <ArrowUpRight className={`h-5 w-5 ${growthIsPositive ? "text-emerald-500" : "text-red-500"}`} strokeWidth={2.5} />
          <p className={`text-2xl font-bold tracking-tight ${growthIsPositive ? "text-emerald-600" : "text-red-600"}`}>
            {growthIsPositive ? "+" : ""}{kpis.growth.toFixed(1)}%
          </p>
        </div>
        <p className={`mt-1 text-xs font-medium ${growthIsPositive ? "text-emerald-600/80" : "text-red-600/80"}`}>
          {growthIsPositive ? "+" : ""}₹{kpis.diff.toFixed(2)} Cr {growthIsPositive ? "surplus" : "deficit"}
        </p>
      </div>
    </div>
  );
}
