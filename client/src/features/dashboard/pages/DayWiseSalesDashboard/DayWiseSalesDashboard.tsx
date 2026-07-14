import { ArrowUpRight } from "lucide-react";
import { DayWiseSalesChart } from "./DayWiseSalesChart";
import { DayWiseSalesDashboardFooter } from "./DayWiseSalesDashboardFooter";
import { DayWiseSalesDashboardHeader } from "./DayWiseSalesDashboardHeader";
import { DayWiseSalesDashboardKpis } from "./DayWiseSalesDashboardKpis";
import { useDayWiseSalesDashboard } from "./hooks/useDayWiseSalesDashboard";

export default function DayWiseSalesDashboard() {
  const {
    activeTag,
    activeView,
    chartData,
    error,
    handleTagClick,
    handleViewModeChange,
    kpis,
    loading,
    tags,
    yConfig,
  } = useDayWiseSalesDashboard();

  const growthIsPositive = kpis.growth >= 0;

  if (loading) {
    return (
      <div className="min-h-[420px] rounded-[10px] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Loading sales trend...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[420px] rounded-[10px] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-red-600">Unable to load chart data.</p>
        <p className="mt-2 text-xs text-slate-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans mt-6">
      <div className="mx-auto overflow-hidden rounded-[10px] bg-white shadow-sm">
        <DayWiseSalesDashboardHeader
          activeTag={activeTag}
          activeView={activeView}
          handleTagClick={handleTagClick}
          handleViewModeChange={handleViewModeChange}
          tags={tags}
        />
        <DayWiseSalesDashboardKpis growthIsPositive={growthIsPositive} kpis={kpis} />

        <div className="px-6 pt-6 pb-2">
          <DayWiseSalesChart chartData={chartData} yConfig={yConfig} />
        </div>

        <DayWiseSalesDashboardFooter />
      </div>
    </div>
  );
}
