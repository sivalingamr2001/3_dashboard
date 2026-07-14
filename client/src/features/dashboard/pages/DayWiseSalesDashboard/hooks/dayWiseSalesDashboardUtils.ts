import type { ChartRow, OperatingUnitTag, SalesTrendDto, YAxisConfig } from "../types";

export const monthsDisplay = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

export const monthKeyMap: Record<string, [string, string | null]> = {
  Apr: ["APR-25", "APR-26"],
  May: ["MAY-25", "MAY-26"],
  Jun: ["JUN-25", "JUN-26"],
  Jul: ["JUL-25", "JUL-26"],
  Aug: ["AUG-25", null],
  Sep: ["SEP-25", null],
  Oct: ["OCT-25", null],
  Nov: ["NOV-25", null],
  Dec: ["DEC-25", null],
  Jan: ["JAN-26", null],
  Feb: ["FEB-26", null],
  Mar: ["MAR-26", null],
};

export const defaultTags: OperatingUnitTag[] = [{ id: null, label: "All Units" }];

export const buildSalesMap = (records: SalesTrendDto[]) =>
  records.reduce<Record<string, number>>((acc, item) => {
    acc[item.mnyr] = (acc[item.mnyr] || 0) + Number(item.salesValue);
    return acc;
  }, {});

export const buildChartData = (records: SalesTrendDto[]): ChartRow[] => {
  const totals = buildSalesMap(records);

  return monthsDisplay.map((month) => {
    const [fy25Key, fy26Key] = monthKeyMap[month];
    return {
      month,
      fy2526: Math.round((totals[fy25Key] || 0) * 100) / 100,
      fy2627: fy26Key != null ? Math.round((totals[fy26Key] || 0) * 100) / 100 : null,
    };
  });
};

export const getKPIs = (chartData: ChartRow[]) => {
  const fy27YTD = chartData.slice(0, 4).reduce((sum, row) => sum + (row.fy2627 || 0), 0);
  const fy26Same = chartData.slice(0, 4).reduce((sum, row) => sum + row.fy2526, 0);
  const growth = fy26Same > 0 ? ((fy27YTD - fy26Same) / fy26Same) * 100 : 0;

  return {
    fy27YTD,
    fy26Same,
    growth,
    diff: fy27YTD - fy26Same,
  };
};

export const getYAxisConfig = (chartData: ChartRow[]) => {
  const values = chartData.flatMap((row) => [row.fy2526, row.fy2627 ?? 0]);
  const maxVal = Math.max(1, ...values);
  const yMax = Math.ceil(maxVal / 200) * 200;
  const step = Math.max(1, yMax / 4);

  return {
    domain: [0, yMax] as [number, number],
    ticks: [0, step, step * 2, step * 3, step * 4].map((value) => Math.round(value)),
  };
};
