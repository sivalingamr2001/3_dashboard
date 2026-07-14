import React, { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
    Cell,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

// ─── Raw Orders Data (from JSON) ───────────────────────────────────
const rawOrders = [
    { yrmn: "2025-04", ordeR_VALUE: 425.57, orG_ID: 103 },
    { yrmn: "2025-04", ordeR_VALUE: 7.39, orG_ID: 204 },
    { yrmn: "2025-04", ordeR_VALUE: 3.64, orG_ID: 584 },
    { yrmn: "2025-04", ordeR_VALUE: 1.77, orG_ID: 684 },
    { yrmn: "2025-04", ordeR_VALUE: 38.68, orG_ID: 704 },
    { yrmn: "2025-04", ordeR_VALUE: 1.74, orG_ID: 844 },
    { yrmn: "2025-04", ordeR_VALUE: 2.39, orG_ID: 405 },
    { yrmn: "2025-05", ordeR_VALUE: 4.49, orG_ID: 405 },
    { yrmn: "2025-05", ordeR_VALUE: 3.71, orG_ID: 844 },
    { yrmn: "2025-05", ordeR_VALUE: 136.55, orG_ID: 704 },
    { yrmn: "2025-05", ordeR_VALUE: 1.93, orG_ID: 684 },
    { yrmn: "2025-05", ordeR_VALUE: 5.57, orG_ID: 584 },
    { yrmn: "2025-05", ordeR_VALUE: 15.28, orG_ID: 204 },
    { yrmn: "2025-05", ordeR_VALUE: 427.35, orG_ID: 103 },
    { yrmn: "2025-06", ordeR_VALUE: 763.39, orG_ID: 103 },
    { yrmn: "2025-06", ordeR_VALUE: 6.88, orG_ID: 204 },
    { yrmn: "2025-06", ordeR_VALUE: 21.73, orG_ID: 584 },
    { yrmn: "2025-06", ordeR_VALUE: 12.39, orG_ID: 684 },
    { yrmn: "2025-06", ordeR_VALUE: 25.98, orG_ID: 704 },
    { yrmn: "2025-06", ordeR_VALUE: 9.42, orG_ID: 844 },
    { yrmn: "2025-06", ordeR_VALUE: 1.39, orG_ID: 405 },
    { yrmn: "2025-07", ordeR_VALUE: 20.94, orG_ID: 405 },
    { yrmn: "2025-07", ordeR_VALUE: 3.02, orG_ID: 844 },
    { yrmn: "2025-07", ordeR_VALUE: 26.19, orG_ID: 704 },
    { yrmn: "2025-07", ordeR_VALUE: 2.27, orG_ID: 684 },
    { yrmn: "2025-07", ordeR_VALUE: 21.53, orG_ID: 584 },
    { yrmn: "2025-07", ordeR_VALUE: 11.65, orG_ID: 204 },
    { yrmn: "2025-07", ordeR_VALUE: 479.42, orG_ID: 103 },
    { yrmn: "2025-08", ordeR_VALUE: 372.67, orG_ID: 103 },
    { yrmn: "2025-08", ordeR_VALUE: 6.93, orG_ID: 204 },
    { yrmn: "2025-08", ordeR_VALUE: 246.83, orG_ID: 584 },
    { yrmn: "2025-08", ordeR_VALUE: 1.98, orG_ID: 684 },
    { yrmn: "2025-08", ordeR_VALUE: 24.86, orG_ID: 704 },
    { yrmn: "2025-08", ordeR_VALUE: 8.74, orG_ID: 844 },
    { yrmn: "2025-08", ordeR_VALUE: 2.59, orG_ID: 405 },
    { yrmn: "2025-09", ordeR_VALUE: 1.9, orG_ID: 405 },
    { yrmn: "2025-09", ordeR_VALUE: 7.2, orG_ID: 844 },
    { yrmn: "2025-09", ordeR_VALUE: 21.72, orG_ID: 704 },
    { yrmn: "2025-09", ordeR_VALUE: 2.02, orG_ID: 684 },
    { yrmn: "2025-09", ordeR_VALUE: 108.63, orG_ID: 584 },
    { yrmn: "2025-09", ordeR_VALUE: 12.97, orG_ID: 204 },
    { yrmn: "2025-09", ordeR_VALUE: 386.82, orG_ID: 103 },
    { yrmn: "2025-10", ordeR_VALUE: 330.09, orG_ID: 103 },
    { yrmn: "2025-10", ordeR_VALUE: 13.34, orG_ID: 204 },
    { yrmn: "2025-10", ordeR_VALUE: 5.75, orG_ID: 584 },
    { yrmn: "2025-10", ordeR_VALUE: 7.64, orG_ID: 684 },
    { yrmn: "2025-10", ordeR_VALUE: 29.64, orG_ID: 704 },
    { yrmn: "2025-10", ordeR_VALUE: 3.49, orG_ID: 844 },
    { yrmn: "2025-10", ordeR_VALUE: 1.58, orG_ID: 405 },
    { yrmn: "2025-11", ordeR_VALUE: 2.93, orG_ID: 405 },
    { yrmn: "2025-11", ordeR_VALUE: 2.54, orG_ID: 844 },
    { yrmn: "2025-11", ordeR_VALUE: 36.18, orG_ID: 704 },
    { yrmn: "2025-11", ordeR_VALUE: 6.59, orG_ID: 684 },
    { yrmn: "2025-11", ordeR_VALUE: 108.99, orG_ID: 584 },
    { yrmn: "2025-11", ordeR_VALUE: 9.52, orG_ID: 204 },
    { yrmn: "2025-11", ordeR_VALUE: 396.05, orG_ID: 103 },
    { yrmn: "2025-12", ordeR_VALUE: 469.84, orG_ID: 103 },
    { yrmn: "2025-12", ordeR_VALUE: 11.66, orG_ID: 204 },
    { yrmn: "2025-12", ordeR_VALUE: 550.77, orG_ID: 584 },
    { yrmn: "2025-12", ordeR_VALUE: 7.86, orG_ID: 684 },
    { yrmn: "2025-12", ordeR_VALUE: 23.03, orG_ID: 704 },
    { yrmn: "2025-12", ordeR_VALUE: 7.86, orG_ID: 844 },
    { yrmn: "2025-12", ordeR_VALUE: 3.73, orG_ID: 405 },
    { yrmn: "2026-01", ordeR_VALUE: 2.36, orG_ID: 405 },
    { yrmn: "2026-01", ordeR_VALUE: 0.71, orG_ID: 1344 },
    { yrmn: "2026-01", ordeR_VALUE: 30.39, orG_ID: 844 },
    { yrmn: "2026-01", ordeR_VALUE: 134.35, orG_ID: 704 },
    { yrmn: "2026-01", ordeR_VALUE: 8.25, orG_ID: 684 },
    { yrmn: "2026-01", ordeR_VALUE: 14.68, orG_ID: 584 },
    { yrmn: "2026-01", ordeR_VALUE: 8.79, orG_ID: 204 },
    { yrmn: "2026-01", ordeR_VALUE: 553.8, orG_ID: 103 },
    { yrmn: "2026-02", ordeR_VALUE: 465.64, orG_ID: 103 },
    { yrmn: "2026-02", ordeR_VALUE: 6.2, orG_ID: 204 },
    { yrmn: "2026-02", ordeR_VALUE: 54.41, orG_ID: 584 },
    { yrmn: "2026-02", ordeR_VALUE: 3.71, orG_ID: 684 },
    { yrmn: "2026-02", ordeR_VALUE: 16.76, orG_ID: 704 },
    { yrmn: "2026-02", ordeR_VALUE: 35.01, orG_ID: 844 },
    { yrmn: "2026-02", ordeR_VALUE: 3.2, orG_ID: 1344 },
    { yrmn: "2026-02", ordeR_VALUE: 0.63, orG_ID: 405 },
    { yrmn: "2026-03", ordeR_VALUE: 7.81, orG_ID: 405 },
    { yrmn: "2026-03", ordeR_VALUE: 1.69, orG_ID: 1344 },
    { yrmn: "2026-03", ordeR_VALUE: 21.71, orG_ID: 844 },
    { yrmn: "2026-03", ordeR_VALUE: 20.39, orG_ID: 704 },
    { yrmn: "2026-03", ordeR_VALUE: 9.69, orG_ID: 684 },
    { yrmn: "2026-03", ordeR_VALUE: 32.37, orG_ID: 584 },
    { yrmn: "2026-03", ordeR_VALUE: 16.39, orG_ID: 204 },
    { yrmn: "2026-03", ordeR_VALUE: 589.38, orG_ID: 103 },
    { yrmn: "2026-04", ordeR_VALUE: 755.75, orG_ID: 103 },
    { yrmn: "2026-04", ordeR_VALUE: 5.44, orG_ID: 204 },
    { yrmn: "2026-04", ordeR_VALUE: 9.73, orG_ID: 584 },
    { yrmn: "2026-04", ordeR_VALUE: 7.82, orG_ID: 684 },
    { yrmn: "2026-04", ordeR_VALUE: 45.14, orG_ID: 704 },
    { yrmn: "2026-04", ordeR_VALUE: 48.57, orG_ID: 844 },
    { yrmn: "2026-04", ordeR_VALUE: 1.47, orG_ID: 1344 },
    { yrmn: "2026-04", ordeR_VALUE: 0.27, orG_ID: 1385 },
    { yrmn: "2026-04", ordeR_VALUE: 0.11, orG_ID: 405 },
    { yrmn: "2026-05", ordeR_VALUE: 1.39, orG_ID: 1385 },
    { yrmn: "2026-05", ordeR_VALUE: 21.14, orG_ID: 1344 },
    { yrmn: "2026-05", ordeR_VALUE: 47.09, orG_ID: 844 },
    { yrmn: "2026-05", ordeR_VALUE: 53.8, orG_ID: 704 },
    { yrmn: "2026-05", ordeR_VALUE: 11.52, orG_ID: 684 },
    { yrmn: "2026-05", ordeR_VALUE: 24.38, orG_ID: 584 },
    { yrmn: "2026-05", ordeR_VALUE: 14.1, orG_ID: 204 },
    { yrmn: "2026-05", ordeR_VALUE: 393.75, orG_ID: 103 },
    { yrmn: "2026-06", ordeR_VALUE: 391.68, orG_ID: 103 },
    { yrmn: "2026-06", ordeR_VALUE: 19.85, orG_ID: 204 },
    { yrmn: "2026-06", ordeR_VALUE: 17.66, orG_ID: 584 },
    { yrmn: "2026-06", ordeR_VALUE: 5.38, orG_ID: 684 },
    { yrmn: "2026-06", ordeR_VALUE: 33.21, orG_ID: 704 },
    { yrmn: "2026-06", ordeR_VALUE: 41.83, orG_ID: 844 },
    { yrmn: "2026-06", ordeR_VALUE: 5.11, orG_ID: 1344 },
    { yrmn: "2026-06", ordeR_VALUE: 0.41, orG_ID: 1385 },
    { yrmn: "2026-07", ordeR_VALUE: 0.05, orG_ID: 1385 },
    { yrmn: "2026-07", ordeR_VALUE: 5.39, orG_ID: 1344 },
    { yrmn: "2026-07", ordeR_VALUE: 35.96, orG_ID: 844 },
    { yrmn: "2026-07", ordeR_VALUE: 19.94, orG_ID: 704 },
    { yrmn: "2026-07", ordeR_VALUE: 0.62, orG_ID: 684 },
    { yrmn: "2026-07", ordeR_VALUE: 2.27, orG_ID: 584 },
    { yrmn: "2026-07", ordeR_VALUE: 19.16, orG_ID: 204 },
    { yrmn: "2026-07", ordeR_VALUE: 251, orG_ID: 103 },
];

// ─── Constants ───────────────────────────────────────────────────────
const MONTH_ORDER = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const FY2526_MONTHS = [
    "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09",
    "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
];

const FY2627_MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07"];

const tags = [
    { id: null, label: "All Units" },
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

// ─── Data Processing ─────────────────────────────────────────────────
function processOrdersData() {
    // Aggregate by yrmn and org_id (values are in Lakhs, convert to Crores)
    const byMonthOrg = {};
    rawOrders.forEach((o) => {
        if (!byMonthOrg[o.yrmn]) byMonthOrg[o.yrmn] = {};
        if (!byMonthOrg[o.yrmn][o.orG_ID]) byMonthOrg[o.yrmn][o.orG_ID] = 0;
        byMonthOrg[o.yrmn][o.orG_ID] += o.ordeR_VALUE;
    });

    // Build chart data per org
    const unitCharts = {};
    const allOrgIds = [...new Set(rawOrders.map((o) => o.orG_ID))].sort((a, b) => a - b);

    allOrgIds.forEach((orgId) => {
        const data = MONTH_ORDER.map((month, i) => {
            const yrmn2526 = FY2526_MONTHS[i];
            const yrmn2627 = FY2627_MONTHS[i];
            const val2526 = (byMonthOrg[yrmn2526]?.[orgId] || 0) / 100;
            const val2627 = yrmn2627 ? (byMonthOrg[yrmn2627]?.[orgId] || 0) / 100 : null;
            return { month, fy2526: Number(val2526.toFixed(2)), fy2627: val2627 !== null ? Number(val2627.toFixed(2)) : null };
        });
        unitCharts[orgId] = data;
    });

    // All Units chart (sum all orgs)
    const allUnitsChart = MONTH_ORDER.map((month, i) => {
        const yrmn2526 = FY2526_MONTHS[i];
        const yrmn2627 = FY2627_MONTHS[i];
        let val2526 = 0;
        let val2627 = 0;
        allOrgIds.forEach((orgId) => {
            val2526 += byMonthOrg[yrmn2526]?.[orgId] || 0;
            if (yrmn2627) val2627 += byMonthOrg[yrmn2627]?.[orgId] || 0;
        });
        return {
            month,
            fy2526: Number((val2526 / 100).toFixed(2)),
            fy2627: yrmn2627 ? Number((val2627 / 100).toFixed(2)) : null,
        };
    });

    // Compute KPIs per unit
    const kpis = {};
    allOrgIds.forEach((orgId) => {
        const fy2627YTD = FY2627_MONTHS.reduce((sum, m) => sum + (byMonthOrg[m]?.[orgId] || 0), 0) / 100;
        const fy2526Same = ["2025-04", "2025-05", "2025-06", "2025-07"].reduce((sum, m) => sum + (byMonthOrg[m]?.[orgId] || 0), 0) / 100;
        const fy2526Full = FY2526_MONTHS.reduce((sum, m) => sum + (byMonthOrg[m]?.[orgId] || 0), 0) / 100;
        const growth = fy2526Same > 0 ? Number((((fy2627YTD - fy2526Same) / fy2526Same) * 100).toFixed(1)) : null;
        const diff = Number((fy2627YTD - fy2526Same).toFixed(2));
        kpis[orgId] = { fy2627_ytd: Number(fy2627YTD.toFixed(2)), fy2526_same: Number(fy2526Same.toFixed(2)), fy2526_full: Number(fy2526Full.toFixed(2)), growth, diff };
    });

    // All Units KPIs
    const allFy2627YTD = FY2627_MONTHS.reduce((sum, m) => {
        return sum + allOrgIds.reduce((s, orgId) => s + (byMonthOrg[m]?.[orgId] || 0), 0);
    }, 0) / 100;
    const allFy2526Same = ["2025-04", "2025-05", "2025-06", "2025-07"].reduce((sum, m) => {
        return sum + allOrgIds.reduce((s, orgId) => s + (byMonthOrg[m]?.[orgId] || 0), 0);
    }, 0) / 100;
    const allFy2526Full = FY2526_MONTHS.reduce((sum, m) => {
        return sum + allOrgIds.reduce((s, orgId) => s + (byMonthOrg[m]?.[orgId] || 0), 0);
    }, 0) / 100;
    const allGrowth = Number((((allFy2627YTD - allFy2526Same) / allFy2526Same) * 100).toFixed(1));
    kpis.all = {
        fy2627_ytd: Number(allFy2627YTD.toFixed(2)),
        fy2526_same: Number(allFy2526Same.toFixed(2)),
        fy2526_full: Number(allFy2526Full.toFixed(2)),
        growth: allGrowth,
        diff: Number((allFy2627YTD - allFy2526Same).toFixed(2)),
    };

    return { allUnitsChart, unitCharts, kpis };
}

const { allUnitsChart, unitCharts, kpis } = processOrdersData();

// ─── Custom Tooltip ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const fy2526Val = payload.find((p) => p.dataKey === "fy2526")?.value ?? null;
    const fy2627Val = payload.find((p) => p.dataKey === "fy2627")?.value ?? null;
    if (fy2526Val === null && fy2627Val === null) return null;

    const growth =
        fy2526Val && fy2627Val && fy2526Val > 0
            ? (((fy2627Val - fy2526Val) / fy2526Val) * 100).toFixed(1)
            : null;
    const diff = fy2526Val && fy2627Val ? (fy2627Val - fy2526Val).toFixed(2) : null;
    const isPositive = growth !== null && parseFloat(growth) >= 0;

    return (
        <div className="min-w-[220px] rounded-xl border border-slate-100 bg-white p-4 shadow-lg">
            <p className="mb-2 text-sm font-bold text-slate-800">{label}</p>
            {fy2627Val !== null && (
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">FY 2026-27</span>
                    <span className="text-xs font-bold text-indigo-600">₹{fy2627Val.toFixed(2)} Cr</span>
                </div>
            )}
            {fy2526Val !== null && (
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">FY 2025-26</span>
                    <span className="text-xs font-semibold text-slate-600">₹{fy2526Val.toFixed(2)} Cr</span>
                </div>
            )}
            {growth !== null && (
                <div className={`mt-1 flex items-center justify-between rounded-md px-2 py-1.5 ${isPositive ? "bg-emerald-50" : "bg-rose-50"}`}>
                    <div className="flex items-center gap-1">
                        {isPositive ? (
                            <TrendingUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-rose-600" />
                        )}
                        <span className={`text-xs font-semibold ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                            {isPositive ? "+" : ""}{growth}% YoY
                        </span>
                    </div>
                    <span className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPositive ? "+" : ""}₹{diff} Cr
                    </span>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────
export default function SalesOrdersDashboard() {
    const [activeTag, setActiveTag] = useState("All Units");

    const currentTag = tags.find((t) => t.label === activeTag);
    const orgId = currentTag?.id;
    const chartData = orgId === null ? allUnitsChart : unitCharts[orgId];
    const kpiKey = orgId === null ? "all" : orgId;
    const kpi = kpis[kpiKey];

    const isPositive = kpi.growth !== null && kpi.growth >= 0;

    // Compute Y-axis max dynamically
    const allValues = chartData.flatMap((d) => [d.fy2526, d.fy2627].filter((v) => v !== null));
    const maxVal = Math.max(...allValues);
    const yMax = Math.ceil(maxVal / 5) * 5 + 5;

    const handleTagClick = (tag) => {
        setActiveTag(tag.label);
    };

    return (
        <div className="min-h-screen mt-[24px] font-sans">
            <div className="mx-auto overflow-hidden rounded-[10px] bg-white shadow-sm">
                {/* ── Header Banner ───────────────────────────────────────── */}
                <div className="bg-[#4c1d95] px-6 pt-5 pb-4">
                    <h1 className="text-lg font-bold tracking-tight text-white">
                        Sales Orders — Month-wise Trend
                    </h1>
                    <p className="mt-0.5 mb-3 text-xs text-purple-200/70">
                        FY 2026-27 vs FY 2025-26 • Crores • Actuals through Jul
                    </p>

                    {/* Filter Tags */}
                    <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1">
                        {tags.map((tag, index) => (
                            <React.Fragment key={tag.label}>
                                <button
                                    onClick={() => handleTagClick(tag)}
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${activeTag === tag.label
                                        ? `bg-white text-[#4c1d95] shadow-sm ${index <= 1 ? "border border-purple-400/40" : "border-none"}`
                                        : `text-white/80 hover:border-white/50 ${index <= 1 ? "border border-purple-400/40" : "border-none bg-white/10 hover:bg-white/20"}`
                                        }`}
                                >
                                    {tag.label}
                                </button>
                                {index === 1 && (
                                    <span className="flex items-center px-1 text-sm font-bold text-white/60 select-none">
                                        ·
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* ── KPI Cards Row ───────────────────────────────────────── */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="px-6 py-5">
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            FY 2026-27 YTD
                        </p>
                        <p className="text-2xl font-bold tracking-tight text-blue-600">
                            ₹{kpi.fy2627_ytd.toFixed(2)} <span className="text-sm font-medium text-blue-500">Cr</span>
                        </p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-blue-100">
                            <div className="h-full w-full rounded-full bg-blue-500" />
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            FY 2025-26 SAME PERIOD
                        </p>
                        <p className="text-2xl font-bold tracking-tight text-slate-500">
                            ₹{kpi.fy2526_same.toFixed(2)} <span className="text-sm font-medium text-slate-400">Cr</span>
                        </p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-full rounded-full bg-slate-300" />
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            YOY GROWTH
                        </p>
                        <div className="flex items-center gap-1.5">
                            {isPositive ? (
                                <ArrowUpRight className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
                            ) : (
                                <ArrowDownRight className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
                            )}
                            <p className={`text-2xl font-bold tracking-tight ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                {kpi.growth !== null ? `${isPositive ? "+" : ""}${kpi.growth}%` : "N/A"}
                            </p>
                        </div>
                        <p className={`mt-1 text-xs font-medium ${isPositive ? "text-emerald-600/80" : "text-rose-600/80"}`}>
                            {kpi.growth !== null
                                ? `${isPositive ? "+" : ""}₹${kpi.diff.toFixed(2)} Cr`
                                : "New unit"}
                        </p>
                    </div>
                </div>

                {/* ── Chart Section ───────────────────────────────────────── */}
                <div className="relative px-6 pt-6 pb-2">
                    <div className="absolute top-4 left-[18%] z-10 flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-orange-400" />
                        <span className="text-[10px] font-bold tracking-wide text-orange-500 uppercase">
                            TODAY CUTOFF
                        </span>
                    </div>

                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 35, right: 10, left: -10, bottom: 5 }}
                            barCategoryGap="30%"
                            barGap={2}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                                tickFormatter={(v) => `₹${v}`}
                                domain={[0, yMax]}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                            />

                            <ReferenceArea
                                x1="Jul"
                                x2="Jul"
                                fill="rgba(251, 146, 60, 0.10)"
                                stroke="none"
                            />

                            <Bar dataKey="fy2526" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={18} />
                            <Bar dataKey="fy2627" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={18}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-2627-${index}`}
                                        fill={entry.fy2627 !== null ? "#6366f1" : "transparent"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* ── Legend ──────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-center gap-5 px-6 pt-2 pb-6">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <span className="text-[11px] font-medium text-slate-500">FY 2025-26</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        <span className="text-[11px] font-medium text-slate-500">FY 2026-27</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                        <span className="text-[11px] font-medium text-slate-500">FY 2026-27 actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        <span className="text-[11px] font-medium text-slate-500">FY 2025-26 reference</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                        <span className="text-[11px] font-medium text-orange-500">Today cutoff</span>
                    </div>
                </div>
            </div>
        </div>
    );
}