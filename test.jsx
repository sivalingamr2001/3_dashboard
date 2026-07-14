import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, Cell,
} from "recharts";
import { ArrowUpRight, TrendingUp, Calendar, Clock, BarChart3 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// DATA SOURCE: sales[]
// ═══════════════════════════════════════════════════════════════════
const salesDataByMonthWise = [];
const salesDataByDayWise = [];
const salesDataByYTDWise = [];

const tags = [
  { id: null as number | null, label: "All Units" },
  { id: 103, label: "Janatics" },
  { id: 684, label: "Dubai" },
  { id: 844, label: "Global" },
  { id: 1344, label: "Global USA" },
  { id: 584, label: "JIAPL" },
  { id: 704, label: "Polymer" },
  { id: 204, label: "SKYFAST" },
  { id: 405, label: "USA" },
  { id: 1385, label: "Vietnam" },
];

const viewModes = [
  { label: "Day-wise", icon: Calendar },
  { label: "Month-wise", icon: Clock },
  { label: "Year-to-Date", icon: BarChart3 },
];

const monthsDisplay = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

const monthKeyMap: Record<string, [string, string | null]> = {
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

interface ChartRow {
  month: string;
  fy2526: number;
  fy2627: number | null;
}

function getChartData(orgId: number | null): ChartRow[] {
  const monthTotals: Record<string, number> = {};
  for (const s of salesData) {
    if (orgId == null || s.orG_ID === orgId) {
      monthTotals[s.mnyr] = (monthTotals[s.mnyr] || 0) + s.saleS_VALUE;
    }
  }
  return monthsDisplay.map((m) => {
    const [fy25Key, fy26Key] = monthKeyMap[m];
    const fy25Val = monthTotals[fy25Key] || 0;
    const fy26Val = fy26Key ? (monthTotals[fy26Key] || 0) : null;
    return {
      month: m,
      fy2526: Math.round(fy25Val * 100) / 100,
      fy2627: fy26Val != null ? Math.round(fy26Val * 100) / 100 : null,
    };
  });
}

function getKPIs(chartData: ChartRow[]) {
  const fy27YTD = chartData.slice(0, 4).reduce((sum, d) => sum + (d.fy2627 || 0), 0);
  const fy26Same = chartData.slice(0, 4).reduce((sum, d) => sum + d.fy2526, 0);
  const growth = fy26Same > 0 ? ((fy27YTD - fy26Same) / fy26Same) * 100 : 0;
  const diff = fy27YTD - fy26Same;
  return { fy27YTD, fy26Same, growth, diff };
}

function getYAxisConfig(chartData: ChartRow[]) {
  const allValues: number[] = [];
  for (const d of chartData) {
    if (d.fy2526 != null) allValues.push(d.fy2526);
    if (d.fy2627 != null) allValues.push(d.fy2627);
  }
  const maxVal = Math.max(...allValues, 1);
  const yMax = Math.ceil(maxVal / 200) * 200;
  const step = yMax / 4;
  const ticks = [0, step, step * 2, step * 3, step * 4].map((v) => Math.round(v));
  return { domain: [0, yMax] as [number, number], ticks };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const fy2526Entry = payload.find((p: any) => p.dataKey === "fy2526");
  const fy2627Entry = payload.find((p: any) => p.dataKey === "fy2627");
  const fy2526Val = fy2526Entry?.value ?? null;
  const fy2627Val = fy2627Entry?.value ?? null;
  if (fy2526Val === null && fy2627Val === null) return null;
  const growth =
    fy2526Val && fy2627Val
      ? (((fy2627Val - fy2526Val) / fy2526Val) * 100).toFixed(1)
      : null;
  const diff = fy2526Val && fy2627Val ? (fy2627Val - fy2526Val).toFixed(2) : null;
  const growthNum = growth != null ? Number(growth) : null;
  const isPositive = growthNum == null || growthNum >= 0;
  return (
    <div className="min-w-[200px] rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
      <p className="mb-2.5 text-sm font-bold text-slate-800">{label}</p>
      {fy2627Val !== null && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">FY 2026-27</span>
          <span className="text-xs font-bold text-emerald-600">
            ₹{Number(fy2627Val).toFixed(2)} Cr
          </span>
        </div>
      )}
      {fy2526Val !== null && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">FY 2025-26</span>
          <span className="text-xs font-semibold text-slate-500">
            ₹{Number(fy2526Val).toFixed(2)} Cr
          </span>
        </div>
      )}
      {growth !== null && (
        <div
          className={`mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
            isPositive ? "bg-emerald-50" : "bg-red-50"
          }`}
        >
          <div className="flex items-center gap-1">
            <TrendingUp
              className={`h-3 w-3 ${
                isPositive ? "text-emerald-600" : "text-red-600"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                isPositive ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {growth}% YoY
            </span>
          </div>
          <span
            className={`text-xs font-semibold ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : ""}₹{diff} Cr
          </span>
        </div>
      )}
    </div>
  );
}

export default function DayWiseSalesDashboard() {
  const [activeTag, setActiveTag] = useState("All Units");
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState("Day-wise");
  const chartData = useMemo(() => getChartData(activeOrgId), [activeOrgId]);
  const kpis = useMemo(() => getKPIs(chartData), [chartData]);
  const yConfig = useMemo(() => getYAxisConfig(chartData), [chartData]);
  const handleTagClick = (tag: (typeof tags)[number]) => {
    setActiveTag(tag.label);
    setActiveOrgId(tag.id);
  };
  const growthIsPositive = kpis.growth >= 0;

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[10px] bg-white shadow-sm">
        {/* Header Banner */}
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
                const Icon = mode.icon;
                const isActive = activeView === mode.label;
                return (
                  <button
                    key={mode.label}
                    onClick={() => setActiveView(mode.label)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-white text-emerald-800 shadow-sm"
                        : "text-emerald-200/70 hover:text-emerald-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 mt-3">
            {tags.map((tag, index) => (
              <React.Fragment key={tag.label}>
                <button
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
                {index === 1 && (
                  <span className="flex select-none items-center px-1 text-sm font-bold text-white/60">
                    ·
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-6 py-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              FY 2026-27 YTD
            </p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600">
              ₹{kpis.fy27YTD.toFixed(2)}{" "}
              <span className="text-sm font-medium text-emerald-500">Cr</span>
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              SAME PERIOD FY 2025-26
            </p>
            <p className="text-2xl font-bold tracking-tight text-slate-500">
              ₹{kpis.fy26Same.toFixed(2)}{" "}
              <span className="text-sm font-medium text-slate-400">Cr</span>
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-full rounded-full bg-slate-300" />
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              GROWTH VS PREV FY
            </p>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight
                className={`h-5 w-5 ${
                  growthIsPositive ? "text-emerald-500" : "text-red-500"
                }`}
                strokeWidth={2.5}
              />
              <p
                className={`text-2xl font-bold tracking-tight ${
                  growthIsPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {growthIsPositive ? "+" : ""}
                {kpis.growth.toFixed(1)}%
              </p>
            </div>
            <p
              className={`mt-1 text-xs font-medium ${
                growthIsPositive ? "text-emerald-600/80" : "text-red-600/80"
              }`}
            >
              {growthIsPositive ? "+" : ""}₹{kpis.diff.toFixed(2)} Cr{" "}
              {growthIsPositive ? "surplus" : "deficit"}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="px-6 pt-6 pb-2">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              barCategoryGap="20%"
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickFormatter={(v: number) => `₹${Math.round(v)}`}
                domain={yConfig.domain}
                ticks={yConfig.ticks}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              />
              <Bar
                dataKey="fy2526"
                fill="#94a3b8"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="fy2627"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-2627-${index}`}
                    fill={entry.fy2627 !== null ? "#10b981" : "transparent"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 px-6 pt-1 pb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">FY 2025-26</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-[11px] font-medium text-slate-500">FY 2026-27</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-5 px-6 pt-0 pb-6">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium text-slate-400">FY 2026-27 actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span className="text-[10px] font-medium text-slate-400">FY 2025-26 reference</span>
          </div>
        </div>
      </div>
    </div>
  );
}