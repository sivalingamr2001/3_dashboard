import { useEffect, useMemo, useState } from "react";
import {
  getOperatingUnits,
  getRolling10d,
  getSalesTrend,
  getYtdCumulative,
} from "../api/orderSalesApi";
import type { ChartRow, OperatingUnitTag, YAxisConfig } from "../types";
import {
  buildDayChartData,
  buildMonthChartData,
  buildYtdChartData,
  defaultTags,
  getKPIs,
  getYAxisConfig,
} from "../utils";

export const useDayWiseSalesDashboard = () => {
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);
  const [tags, setTags] = useState<OperatingUnitTag[]>(defaultTags);
  const [activeTag, setActiveTag] = useState("All Units");
  const [activeView, setActiveView] = useState("Day-wise");
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const loadOperatingUnits = async () => {
      try {
        const units = await getOperatingUnits();
        setTags(units);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
      }
    };

    void loadOperatingUnits();
  }, []);

  useEffect(() => {
    const loadTrend = async () => {
      setLoading(true);
      setError(undefined);

      try {
        if (activeView === "Day-wise") {
          const records = await getRolling10d(activeOrgId);
          setChartData(buildDayChartData(records));
          return;
        }

        if (activeView === "Month-wise") {
          const records = await getSalesTrend(activeOrgId);
          setChartData(buildMonthChartData(records));
          return;
        }

        const records = await getYtdCumulative(activeOrgId);
        setChartData(buildYtdChartData(records));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
      } finally {
        setLoading(false);
      }
    };

    void loadTrend();
  }, [activeOrgId, activeView]);

  const kpis = useMemo(() => getKPIs(chartData), [chartData]);
  const yConfig = useMemo(() => getYAxisConfig(chartData), [chartData]);

  const handleTagClick = (tag: OperatingUnitTag) => {
    setActiveTag(tag.label);
    setActiveOrgId(tag.id);
  };

  const handleViewModeChange = (view: string) => {
    setActiveView(view);
  };

  return {
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
  };
};
