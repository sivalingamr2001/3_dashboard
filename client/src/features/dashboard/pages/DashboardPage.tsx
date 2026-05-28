import { useSales } from "@/context/SalesContext";
import type { TotalsRow } from "@/features/dashboard/types/dashboard.types";
import { PageLoader } from "@/shared/components/LoadingSpinner/LoadingSpinner";
import { useEffect, useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import { KpiCards } from "../components/KpiCards";
import { OperatingUnitsTable } from "../components/OperatingUnitsTable";

export const DashboardPage = () => {
  const { rows, totals, loading, sales, inclIntraSales, toggleIntraSales } = useSales();
  const [selectedTotals, setSelectedTotals] = useState<TotalsRow | null>(null);

  const isOverlayLoading = sales.length > 0 && loading;
  const displayedTotals = selectedTotals ?? totals;

  useEffect(() => {
    setSelectedTotals(null);
  }, [totals]);

  useEffect(() => {
    if (isOverlayLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup function to ensure overflow resets if component unmounts
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOverlayLoading]);

  if (sales.length === 0 && loading) {
    return (
      <main className="h-screen bg-transparent p-6 backdrop-blur-sm md:p-8">
        <div className="max-w-8xl mx-auto flex h-full items-center justify-center">
          <PageLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#f8fafc] p-6 md:p-8">
      <div className={`mx-auto max-w-360 ${isOverlayLoading ? "opacity-70" : ""}`}>
        <DashboardHeader
          inclIntraSales={inclIntraSales}
          onToggleIntraSales={toggleIntraSales}
        />
        <KpiCards totals={displayedTotals} />
        <OperatingUnitsTable rows={rows} onSelectionTotalsChange={setSelectedTotals} />
      </div>

      {isOverlayLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <PageLoader />
        </div>
      ) : null}
    </main>
  );
};
