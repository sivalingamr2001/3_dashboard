import { Card } from "@/shared/components/ui/card";
import { IndianRupee, Package, Warehouse, TrendingUp, TrendingDown } from "lucide-react";
import type { TotalsRow } from "@/features/dashboard/types/dashboard.types";
import { getCurrentFinancialYear } from "@/lib/utils";
import { useSales } from "@/context/SalesContext";

type Props = {
  totals: TotalsRow;
};

const getTrendBadge = (trend: string) => {
  const value = Number(trend);
  if (value > 0) {
    return {
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      label: `+${trend}%`,
      badgeClass: "bg-emerald-700 text-white",
    };
  }

  if (value < 0) {
    return {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      label: `${trend}%`,
      badgeClass: "bg-rose-600 text-white",
    };
  }

  return {
    icon: (
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-xs">
        =
      </span>
    ),
    label: `0.00%`,
    badgeClass: "bg-yellow-400 text-slate-900",
  };
};

export const KpiCards = ({ totals }: Props) => {
  const currentFY = getCurrentFinancialYear();
  const { asOnDate } = useSales();
  const trendBadge = getTrendBadge(totals.trend);
  return (
    <div className="mb-8 grid gap-6 md:grid-cols-3">
      {/* Group Turnover */}
      <Card className="flex flex-col justify-between rounded-xl border-2 border-blue-400 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full border border-blue-100 bg-blue-50 p-3">
              <IndianRupee className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Group Turnover *</h3>
              <p className="text-xs font-medium text-slate-400">As on {asOnDate}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-blue-50/50 bg-[#f4f7fd] p-4">
              <p className="text-xs font-bold tracking-wider text-blue-500 uppercase">
                Current FY
              </p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">
                ₹{totals.to_fy27_date}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">Crores</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-[#f8f9fa] p-4">
              <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Previous FY
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-700">
                ₹{totals.to_fy26_date}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">Crores</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold shadow-sm ${trendBadge.badgeClass}`}
          >
            {trendBadge.icon} {trendBadge.label}
          </span>
        </div>
      </Card>

      {/* Pending Orders */}
      <Card className="rounded-xl border-2 border-amber-400 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-full border border-amber-100 bg-amber-50 p-3">
            <Package className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Pending Orders *</h3>
            <p className="text-xs font-medium text-slate-400">{asOnDate}</p>
          </div>
        </div>
        <div className="flex h-[130px] flex-col items-center justify-center rounded-xl border border-amber-200/70 bg-[#fff9f2] p-5 text-center">
          <p className="text-xs font-bold tracking-wider text-amber-700/80 uppercase">
            Current FY {currentFY}
          </p>
          <p className="mt-1.5 text-4xl font-black text-[#e67e22]">₹{totals.po_date}</p>
          <p className="mt-1 text-xs font-bold text-amber-600/70">Crores (INR)</p>
        </div>
      </Card>

      {/* Inventory Value */}
      <Card className="rounded-xl border-2 border-emerald-400 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 p-3">
            <Warehouse className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Inventory Value *</h3>
            <p className="text-xs font-medium text-slate-400">{asOnDate}</p>
          </div>
        </div>
        <div className="flex h-[130px] flex-col items-center justify-center rounded-xl border border-emerald-200/70 bg-[#f3fbf6] p-5 text-center">
          <p className="text-xs font-bold tracking-wider text-emerald-700/80 uppercase">
            As on Date
          </p>
          <p className="mt-1.5 text-4xl font-black text-[#2e7d32]">₹{totals.inv}</p>
          <p className="mt-1 text-xs font-bold text-emerald-600/70">Crores (INR)</p>
        </div>
      </Card>
    </div>
  );
};
