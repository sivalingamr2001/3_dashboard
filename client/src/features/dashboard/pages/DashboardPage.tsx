import { useSales } from "@/features/dashboard/hooks/useSales";
import { transformSalesToOperatingUnits } from "@/features/dashboard/api/dashboardTransform";
import { TOTALS_ROW, OPERATING_UNITS_DATA } from "@/features/dashboard/api/dashboardApi";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { DashboardHeader } from "../components/DashboardHeader";
import { KpiCards } from "../components/KpiCards";
import { OperatingUnitsTable } from "../components/OperatingUnitsTable";
import { useErrorHandler } from "@/shared/hooks/useErrorHandler";
import { PageLoader } from "@/shared/components/LoadingSpinner";

export const DashboardPage = () => {
  const { inclIntraSales, handleToggleIntraSales } = useDashboard();
  const { data: salesResponse, isLoading, error } = useSales({ limit: 100 });
  const { handleError } = useErrorHandler();

  // Handle errors
  if (error) {
    handleError(error);
  }

  // Transform data from server or use mock data as fallback
  const { units, totals } = salesResponse?.data
    ? transformSalesToOperatingUnits(salesResponse.data)
    : { units: OPERATING_UNITS_DATA, totals: TOTALS_ROW };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] p-6 md:p-8">
        <div className="mx-auto max-w-8xl flex items-center justify-center h-96">
          <PageLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader
          inclIntraSales={inclIntraSales}
          onToggleIntraSales={handleToggleIntraSales}
        />
        <KpiCards totals={totals} />
        <OperatingUnitsTable rows={units} totals={totals} />
      </div>
    </main>
  );
};
