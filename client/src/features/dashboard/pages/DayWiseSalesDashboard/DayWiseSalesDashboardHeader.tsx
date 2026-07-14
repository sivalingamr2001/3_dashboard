import { BarChart3, Calendar, Clock } from "lucide-react";
import type { OperatingUnitTag } from "./types";

interface DayWiseSalesDashboardHeaderProps {
  activeTag: string;
  activeView: string;
  handleTagClick: (tag: OperatingUnitTag) => void;
  handleViewModeChange: (view: string) => void;
  tags: OperatingUnitTag[];
}

const viewModes = [
  { label: "Day-wise", icon: Calendar },
  { label: "Month-wise", icon: Clock },
  { label: "Year-to-Date", icon: BarChart3 },
];

export function DayWiseSalesDashboardHeader({
  activeTag,
  activeView,
  handleTagClick,
  handleViewModeChange,
  tags,
}: DayWiseSalesDashboardHeaderProps) {
  return (
    <div className="bg-emerald-800 px-6 pt-5 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-emerald-200">₹</span>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Sales — Actual vs Prior Year
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-emerald-200/60">
            FY 2026-27 vs FY 2025-26 • ₹ Crores
          </p>
        </div>

        <div className="flex rounded-lg bg-emerald-900/50 p-0.5">
          {viewModes.map((mode) => {
            const isActive = activeView === mode.label;
            return (
              <button
                key={mode.label}
                type="button"
                onClick={() => handleViewModeChange(mode.label)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-emerald-200/70 hover:text-emerald-100"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 mt-3">
        {tags.map((tag, index) => (
          <div key={tag.label} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTag === tag.label
                  ? "bg-white text-emerald-800 shadow-sm"
                  : index <= 1
                  ? "border border-emerald-400/40 text-emerald-100/80 hover:bg-white/10"
                  : "border-none bg-white/10 text-emerald-100/80 hover:bg-white/20"
              }`}
            >
              {tag.label}
            </button>
            {index === 1 ? (
              <span className="select-none px-1 text-sm font-bold text-white/60">·</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
