import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartRow, YAxisConfig } from "./types";
import { CustomTooltip } from "./DayWiseSalesTooltip";
import { parseISO, isValid, format } from "date-fns";

interface DayWiseSalesChartProps {
  chartData: ChartRow[];
  yConfig: YAxisConfig;
}

const renderCells = (chartData: ChartRow[]) =>
  chartData.map((entry, index) => (
    <Cell
      key={`cell-2627-${index}`}
      fill={entry.fy2627 !== null ? "#10b981" : "transparent"}
    />
  ));

export function DayWiseSalesChart({ chartData, yConfig }: DayWiseSalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
        barCategoryGap="20%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
          tickFormatter={(value: string) => {
            if (typeof value !== "string") return String(value);
            try {
              const d = parseISO(value);
              if (isValid(d)) return format(d, "d LLL");
            } catch (e) {
              // ignore
            }
            return value;
          }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          tickFormatter={(value: number) => `₹${Math.round(value)}`}
          domain={yConfig.domain}
          ticks={yConfig.ticks}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
        <Bar dataKey="fy2526" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="fy2627" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24}>
          {renderCells(chartData)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
