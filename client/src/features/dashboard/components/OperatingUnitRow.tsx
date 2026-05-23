import { TableCell, TableRow } from "@/shared/components/ui/table";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { OperatingUnit } from "@/features/dashboard/types/dashboard.types";

type Props = {
  row: OperatingUnit;
};

const getRowTrendBadge = (trend: string) => {
  const value = Number(trend);
  if (value > 0) {
    return {
      icon: <TrendingUp className="mr-0.5 h-3.5 w-3.5 shrink-0" />,
      badgeClass: "bg-[#d1fae5] text-emerald-700",
    };
  }

  if (value < 0) {
    return {
      icon: <TrendingDown className="mr-0.5 h-3.5 w-3.5 shrink-0" />,
      badgeClass: "bg-[#fee2e2] text-rose-700",
    };
  }

  return {
    icon: (
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-xs">
        =
      </span>
    ),
    badgeClass: "bg-[#fef3c7] text-amber-700",
  };
};

export const OperatingUnitRow = ({ row }: Props) => {
  const trendBadge = getRowTrendBadge(row.trend);
  return (
    <TableRow className="border-b border-slate-100">
      <TableCell className="inline-block max-w-[340px] border-r border-slate-100 bg-white px-4 py-3.5 text-xs font-semibold tracking-tight break-words whitespace-normal text-slate-800 normal-case md:table-cell lg:text-sm">
        {row.unit}
      </TableCell>

      <TableCell className="border-r border-slate-100 bg-[#f1f5f9] px-3 py-3.5 text-right text-xs font-semibold whitespace-nowrap text-blue-600 tabular-nums lg:text-sm">
        ₹{row.to_fy27_date}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#f8fafc] px-3 py-3.5 text-right text-xs font-medium whitespace-nowrap text-blue-500 tabular-nums lg:text-sm">
        ₹{row.to_fy27_month}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#f1f5f9] px-3 py-3.5 text-right text-xs font-medium whitespace-nowrap text-slate-600 tabular-nums lg:text-sm">
        ₹{row.to_fy26_date}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#f8fafc] px-3 py-3.5 text-right text-xs font-medium whitespace-nowrap text-slate-500 tabular-nums lg:text-sm">
        ₹{row.to_fy26_month}
      </TableCell>

      <TableCell className="border-r border-slate-100 px-2 py-3.5 text-center whitespace-nowrap">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${trendBadge.badgeClass}`}
        >
          {trendBadge.icon} {row.trend}%
        </span>
      </TableCell>

      <TableCell className="border-r border-slate-100 bg-[#fffbeb] px-3 py-3.5 text-right text-xs font-semibold whitespace-nowrap text-amber-700 tabular-nums lg:text-sm">
        ₹{row.po_date}
      </TableCell>
      <TableCell className="border-r border-slate-100 bg-[#fffdfa] px-3 py-3.5 text-right text-xs font-medium whitespace-nowrap text-amber-600 tabular-nums lg:text-sm">
        ₹{row.po_month}
      </TableCell>

      <TableCell className="bg-[#f0fdf4] px-4 py-3.5 text-right text-xs font-semibold whitespace-nowrap text-emerald-700 tabular-nums lg:text-sm">
        ₹{row.inv}
      </TableCell>
    </TableRow>
  );
};
