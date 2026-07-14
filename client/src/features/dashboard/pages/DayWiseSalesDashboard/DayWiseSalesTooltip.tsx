import { TrendingUp } from "lucide-react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}

const formatAmount = (value: number) => `₹${value.toFixed(2)} Cr`;

const getTooltipValues = (payload?: Array<{ dataKey: string; value: number }>) => {
  const fy2526 = payload?.find((item) => item.dataKey === "fy2526")?.value ?? null;
  const fy2627 = payload?.find((item) => item.dataKey === "fy2627")?.value ?? null;
  return { fy2526, fy2627 };
};

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const { fy2526, fy2627 } = getTooltipValues(payload);
  if (fy2526 == null && fy2627 == null) {
    return null;
  }

  const growth =
    fy2526 && fy2627 ? (((fy2627 - fy2526) / fy2526) * 100).toFixed(1) : null;
  const diff = fy2526 && fy2627 ? (fy2627 - fy2526).toFixed(2) : null;
  const isPositive = growth == null || Number(growth) >= 0;

  return (
    <div className="min-w-[200px] rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
      <p className="mb-2.5 text-sm font-bold text-slate-800">{label}</p>
      {fy2627 != null && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">FY 2026-27</span>
          <span className="text-xs font-bold text-emerald-600">{formatAmount(fy2627)}</span>
        </div>
      )}
      {fy2526 != null && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">FY 2025-26</span>
          <span className="text-xs font-semibold text-slate-500">{formatAmount(fy2526)}</span>
        </div>
      )}
      {growth != null && diff != null && (
        <div className={`mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 ${isPositive ? "bg-emerald-50" : "bg-red-50"}`}>
          <div className="flex items-center gap-1">
            <TrendingUp className={isPositive ? "h-3 w-3 text-emerald-600" : "h-3 w-3 text-red-600"} />
            <span className={isPositive ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-red-700"}>
              {growth}% YoY
            </span>
          </div>
          <span className={isPositive ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-red-600"}>
            {isPositive ? "+" : ""}{formatAmount(Number(diff))}
          </span>
        </div>
      )}
    </div>
  );
}
