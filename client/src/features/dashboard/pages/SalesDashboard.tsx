import React, { useState, useMemo, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, ReferenceLine, Cell
} from "recharts";
import { ArrowUpRight, TrendingUp, Calendar, Clock, BarChart3 } from "lucide-react";
import { getTags, getSalesDataByDayWise, getSalesDataByMonthWise } from "../api/axiosClient";
import { PageLoader } from "@/shared/components/LoadingSpinner/LoadingSpinner";

// ============================================
// API INTERFACES (match your API response)
// ============================================
export interface TagsData {
    orgId: number | null;
    ouName: string;
}

export interface DayWiseSalesData {
    orgId: number;
    ouName: string;
    calenderDay: string;
    cySales: number;
    pySales: number;
    migratedAt: Date;
}

export interface SalesDataByMonthData {
    orgId: number;
    ouName: string;
    fiscalYearPeriod: string;
    yrmn: string;
    mnyr: string;
    salesValue: number;
    migratedAt: Date;
}

// ============================================
// API CLIENT (replace with your actual axiosClient)
// ============================================
// import { getSalesDataByDayWise, getSalesDataByMonthWise, getTags } from "../api/axiosClient";

// ============================================
// CONSTANTS
// ============================================
const viewModes = [
    { label: "Day-wise", icon: Calendar },
    { label: "Month-wise", icon: Clock },
    { label: "Year-to-Date", icon: BarChart3 },
];

// ============================================
// DYNAMIC DERIVED CONSTANTS FROM API DATA
// ============================================

/**
 * Derive month display order from API data.
 * Extracts all unique mnyr values, groups by fiscalYearPeriod,
 * sorts by yrmn (YYYYMM), and returns display labels.
 */
function deriveMonthConfig(monthData: SalesDataByMonthData[]) {
    const prevMonths = monthData
        .filter(d => d.fiscalYearPeriod === "Previous FY" && d.mnyr)
        .map(d => ({ mnyr: d.mnyr, yrmn: d.yrmn }));
    const currMonths = monthData
        .filter(d => d.fiscalYearPeriod === "Current FY" && d.mnyr)
        .map(d => ({ mnyr: d.mnyr, yrmn: d.yrmn }));

    // Sort by yrmn (chronological)
    const sortByYrmn = (a: any, b: any) => a.yrmn.localeCompare(b.yrmn);
    const sortedPrev = [...new Map(prevMonths.map(m => [m.mnyr, m])).values()].sort(sortByYrmn);
    const sortedCurr = [...new Map(currMonths.map(m => [m.mnyr, m])).values()].sort(sortByYrmn);

    // Extract mnyr arrays
    const prevFyMonths = sortedPrev.map(m => m.mnyr);
    const currFyMonths = sortedCurr.map(m => m.mnyr);

    // Derive display labels from mnyr (e.g., "APR-25" -> "Apr")
    const mnyrToDisplay = (mnyr: string) => {
        if (!mnyr) return "";
        const parts = mnyr.split("-");
        const monthPart = parts[0];
        if (!monthPart || monthPart.length === 0) return mnyr;
        return monthPart.charAt(0) + monthPart.slice(1).toLowerCase();
    };

    // Build full 12-month display using prev FY as reference (or curr FY if prev missing)
    const allMnyr = prevFyMonths.length > 0 ? prevFyMonths : currFyMonths;
    const monthsDisplay = allMnyr.map(mnyrToDisplay);

    return { monthsDisplay, prevFyMonths, currFyMonths };
}

/**
 * Derive day labels from API data.
 * Maps calenderDay values to display labels based on the current FY month.
 */
function deriveDayConfig(dayData: DayWiseSalesData[]) {
    const days = [...new Set(dayData.map(d => d.calenderDay).filter(d => d))].sort();
    // Extract day number and map to "DD Mmm" format
    // The calenderDay format is "DD-MMM" (e.g., "04-JUL")
    // We display as "DD Mmm" where Mmm is the short month name
    const dayLabelMap: Record<string, string> = {};
    days.forEach(day => {
        const parts = day.split("-");
        if (parts.length >= 2) {
            const [dd, mmm] = parts;
            if (mmm && mmm.length > 0) {
                const shortMonth = mmm.charAt(0) + mmm.slice(1).toLowerCase();
                dayLabelMap[day] = `${dd} ${shortMonth}`;
            } else {
                dayLabelMap[day] = day; // Fallback for malformed data
            }
        } else {
            dayLabelMap[day] = day; // Fallback for data without "-"
        }
    });
    return { days, dayLabelMap };
}

// ============================================
// COMPONENT
// ============================================
function SalesDashboard() {
    // --- State ---
    const [tags, setTags] = useState<TagsData[]>([{ orgId: null, ouName: "All Units" }]);
    const [dayWiseSales, setDayWiseSales] = useState<DayWiseSalesData[]>([]);
    const [salesDataByMonth, setSalesDataByMonth] = useState<SalesDataByMonthData[]>([]);
    const [selectedTag, setSelectedTag] = useState<number | null>(null);
    const [activeView, setActiveView] = useState("Day-wise");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Derived Config (from API data) ---
    const monthConfig = useMemo(() => deriveMonthConfig(salesDataByMonth), [salesDataByMonth]);
    const dayConfig = useMemo(() => deriveDayConfig(dayWiseSales), [dayWiseSales]);

    const { monthsDisplay, prevFyMonths, currFyMonths } = monthConfig;
    const { dayLabelMap } = dayConfig;

    const fetchTagsData = async () => {
        const tagsRes = await getTags();
        setTags([{ orgId: null, ouName: "All Units" }, ...tagsRes]);
    }

    useEffect(() => {
        fetchTagsData();
    }, []);

    // --- Fetch Data ---
    // Fetch full datasets once on mount. Subsequent tag clicks will filter locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const dayRes = await getSalesDataByDayWise(null);
                const monthRes = await getSalesDataByMonthWise(null);

                setDayWiseSales(dayRes);
                setSalesDataByMonth(monthRes);

                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Filter Helper ---
    const filterByOrg = <T extends { orgId: number }>(data: T[], orgId: number | null): T[] => {
        if (orgId == null) return data;
        return data.filter(item => item.orgId === orgId);
    };

    // --- Day-wise Chart Data ---
    const getDayWiseData = () => {
        const filtered = filterByOrg(dayWiseSales, selectedTag);
        const days = [...new Set(filtered.map(d => d.calenderDay))].sort();
        return days.map(day => {
            const dayItems = filtered.filter(d => d.calenderDay === day);
            const cy = dayItems.reduce((sum, d) => sum + d.cySales, 0);
            const py = dayItems.reduce((sum, d) => sum + d.pySales, 0);
            return {
                label: dayLabelMap[day] || day,
                fy2526: Math.round(py * 100) / 100,
                fy2627: cy > 0 ? Math.round(cy * 100) / 100 : null,
            };
        }).filter(d => d.fy2526 > 0 || d.fy2627 !== null);
    };

    // --- Month-wise Chart Data ---
    const getMonthWiseData = () => {
        const filtered = filterByOrg(salesDataByMonth, selectedTag);
        const monthTotals: Record<string, number> = {};
        for (const s of filtered) {
            monthTotals[s.mnyr] = (monthTotals[s.mnyr] || 0) + s.salesValue;
        }
        // Use the full 12-month cycle from prevFyMonths as reference
        const allMonths = prevFyMonths.length > 0 ? prevFyMonths : currFyMonths;
        return allMonths.map((mnyr, i) => {
            const displayMonth = monthsDisplay[i] || mnyr;
            // Find corresponding curr FY month (same index in currFyMonths)
            const currMnyr = currFyMonths[i];
            const prevVal = monthTotals[mnyr] || 0;
            const currVal = currMnyr ? (monthTotals[currMnyr] || 0) : 0;
            return {
                label: displayMonth,
                fy2526: Math.round(prevVal * 100) / 100,
                fy2627: currVal > 0 ? Math.round(currVal * 100) / 100 : null,
            };
        });
    };

    // --- YTD Chart Data (Line Chart) ---
    const getYtdData = () => {
        const filtered = filterByOrg(salesDataByMonth, selectedTag);
        const prevMonthly: Record<string, number> = {};
        const currMonthly: Record<string, number> = {};
        for (const s of filtered) {
            if (s.fiscalYearPeriod === "Previous FY") {
                prevMonthly[s.mnyr] = (prevMonthly[s.mnyr] || 0) + s.salesValue;
            } else {
                currMonthly[s.mnyr] = (currMonthly[s.mnyr] || 0) + s.salesValue;
            }
        }
        // Previous FY cumulative
        const prevCum: Record<string, number> = {};
        let cum = 0;
        for (const m of prevFyMonths) {
            cum += (prevMonthly[m] || 0);
            prevCum[m] = Math.round(cum * 100) / 100;
        }
        // Current FY cumulative
        const currCum: Record<string, number> = {};
        cum = 0;
        for (const m of currFyMonths) {
            if (currMonthly[m] != null) {
                cum += currMonthly[m];
                currCum[m] = Math.round(cum * 100) / 100;
            }
        }
        // Build chart data for all months (using prev FY months as reference cycle)
        const allMonths = prevFyMonths.length > 0 ? prevFyMonths : currFyMonths;
        return allMonths.map((mnyr, i) => {
            const displayMonth = monthsDisplay[i] || mnyr;
            const currMnyr = currFyMonths[i];
            return {
                label: displayMonth,
                fy2526: prevCum[mnyr] || null,
                fy2627: currCum[currMnyr] != null ? currCum[currMnyr] : null,
            };
        });
    };

    // --- Today Month (based on current date) ---
    const getTodayMonth = () => {
        // Get current date and determine the month abbreviation
        const today = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonthLabel = monthNames[today.getMonth()].toLowerCase();
        const capitalizedMonth = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);

        // Check if this month exists in monthsDisplay
        if (monthsDisplay.includes(capitalizedMonth)) {
            return capitalizedMonth;
        }

        // Fallback: return the last month with current FY data
        const filtered = filterByOrg(salesDataByMonth, selectedTag);
        const currMonths = filtered
            .filter(d => d.fiscalYearPeriod === "Current FY")
            .map(d => d.mnyr)
            .sort();
        if (currMonths.length === 0) {
            return monthsDisplay[0] || "Apr";
        }
        const lastMonth = currMonths[currMonths.length - 1];
        const idx = currFyMonths.indexOf(lastMonth);
        if (idx >= 0 && idx < monthsDisplay.length) {
            return monthsDisplay[idx];
        }
        const monthPart = lastMonth.split("-")[0];
        return monthPart.charAt(0) + monthPart.slice(1).toLowerCase();
    };

    // --- Chart Data ---
    const chartData = useMemo(() => {
        if (activeView === "Day-wise") return getDayWiseData();
        if (activeView === "Year-to-Date") return getYtdData();
        return getMonthWiseData();
    }, [selectedTag, activeView, dayWiseSales, salesDataByMonth, monthConfig, dayConfig]);

    const todayMonth = useMemo(() => getTodayMonth(), [selectedTag, salesDataByMonth, monthConfig]);
    const dataKey = "label";

    // --- KPIs ---
    const kpis = useMemo(() => {
        if (activeView === "Day-wise") {
            const data = getDayWiseData();
            const fy27 = data.reduce((sum, d) => sum + (d.fy2627 || 0), 0);
            const fy26 = data.reduce((sum, d) => sum + d.fy2526, 0);
            const growth = fy26 > 0 ? ((fy27 - fy26) / fy26) * 100 : 0;
            return {
                title1: "10-DAY SALES FY 2026-27",
                title2: "SAME PERIOD FY 2025-26",
                fy27YTD: fy27,
                fy26Same: fy26,
                growth,
                diff: fy27 - fy26
            };
        }
        if (activeView === "Year-to-Date") {
            const data = getYtdData();
            let lastCurrIdx = -1;
            for (let i = 0; i < data.length; i++) {
                if (data[i].fy2627 != null) lastCurrIdx = i;
            }
            const fy27 = lastCurrIdx >= 0 ? (data[lastCurrIdx].fy2627 || 0) : 0;
            const fy26 = lastCurrIdx >= 0 ? (data[lastCurrIdx].fy2526 || 0) : 0;
            const growth = fy26 > 0 ? ((fy27 - fy26) / fy26) * 100 : 0;
            return {
                title1: "CUMULATIVE YTD",
                title2: "SAME PERIOD FY 2025-26",
                fy27YTD: fy27,
                fy26Same: fy26,
                growth,
                diff: fy27 - fy26
            };
        }
        // Month-wise
        const data = getMonthWiseData();
        let fy27YTD = 0;
        let fy26Same = 0;
        for (const d of data) {
            if (d.fy2627 != null) {
                fy27YTD += d.fy2627;
                fy26Same += d.fy2526;
            }
        }
        const growth = fy26Same > 0 ? ((fy27YTD - fy26Same) / fy26Same) * 100 : 0;
        return {
            title1: "YTD SALES FY 2026-27",
            title2: "SAME PERIOD FY 2025-26",
            fy27YTD,
            fy26Same,
            growth,
            diff: fy27YTD - fy26Same
        };
    }, [selectedTag, activeView, dayWiseSales, salesDataByMonth, monthConfig, dayConfig]);

    // --- Y Axis Config ---
    const yConfig = useMemo(() => {
        const allValues: number[] = [];
        for (const d of chartData) {
            if (d.fy2526 != null) allValues.push(d.fy2526);
            if (d.fy2627 != null) allValues.push(d.fy2627);
        }
        const maxVal = Math.max(...allValues, 1);
        const yMax = activeView === "Year-to-Date"
            ? Math.ceil(maxVal / 500) * 500
            : Math.ceil(maxVal / 50) * 50;
        const step = yMax / 4;
        const ticks = [0, step, step * 2, step * 3, step * 4].map(v => Math.round(v));
        return { domain: [0, yMax] as [number, number], ticks };
    }, [chartData, activeView]);

    const growthIsPositive = kpis.growth >= 0;

    // --- Custom Tooltip ---
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) return null;
        const fy2526Entry = payload.find((p: any) => p.dataKey === "fy2526");
        const fy2627Entry = payload.find((p: any) => p.dataKey === "fy2627");
        const fy2526Val = fy2526Entry?.value ?? null;
        const fy2627Val = fy2627Entry?.value ?? null;
        if (fy2526Val === null && fy2627Val === null) return null;

        const growth = fy2526Val && fy2627Val
            ? (((fy2627Val - fy2526Val) / fy2526Val) * 100).toFixed(1)
            : null;
        const diff = fy2526Val && fy2627Val ? (fy2627Val - fy2526Val).toFixed(2) : null;
        const isPositive = growth == null || Number(growth) >= 0;

        return (
            <div className="min-w-50 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                <p className="mb-2.5 text-sm font-bold text-slate-800">{label}</p>
                {fy2627Val !== null && (
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-slate-500">FY 2026-27</span>
                        <span className="text-xs font-bold text-emerald-600">₹{Number(fy2627Val).toFixed(2)} Cr</span>
                    </div>
                )}
                {fy2526Val !== null && (
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">FY 2025-26</span>
                        <span className="text-xs font-semibold text-slate-500">₹{Number(fy2526Val).toFixed(2)} Cr</span>
                    </div>
                )}
                {growth !== null && (
                    <div className={`mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 ${isPositive ? "bg-emerald-50" : "bg-red-50"}`}>
                        <div className="flex items-center gap-1">
                            <TrendingUp className={`h-3 w-3 ${isPositive ? "text-emerald-600" : "text-red-600"}`} />
                            <span className={`text-xs font-semibold ${isPositive ? "text-emerald-700" : "text-red-700"}`}>{growth}% YoY</span>
                        </div>
                        <span className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                            {isPositive ? "+" : ""}₹{diff} Cr
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // --- Loading / Error ---
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <PageLoader />
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-red-600 font-semibold">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mt-6 font-sans">
            <div className="mx-auto overflow-hidden rounded-[8px] bg-white shadow-sm">
                {/* Header Banner */}
                <div className="bg-emerald-800 px-6 pt-5 pb-4">
                    {/* Stacks elements vertically on mobile, splits side-by-side on desktop screen breakpoints */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg text-emerald-200">₹</span>
                                <h1 className="text-lg font-bold tracking-tight text-white">Sales — Actual vs Prior Year</h1>
                            </div>
                            <p className="mt-0.5 text-xs text-emerald-200/60">FY 2026-27 vs FY 2025-26 • ₹ Crores</p>
                        </div>

                        {/* Tab Switcher: Formats into clean square blocks on mobile, switches back to straight tabs on desktop */}
                        <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-emerald-900/50 p-0.5 sm:flex sm:w-auto">
                            {viewModes.map((mode) => {
                                const Icon = mode.icon;
                                const isActive = activeView === mode.label;
                                return (
                                    <button
                                        key={mode.label}
                                        onClick={() => setActiveView(mode.label)}
                                        className={`flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-center text-[11px] font-medium transition-all sm:flex-row sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs ${isActive
                                            ? "bg-white text-emerald-800 shadow-sm"
                                            : "text-emerald-200/70 hover:text-emerald-100"
                                            }`}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="whitespace-normal leading-tight sm:whitespace-nowrap">{mode.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Horizontal Scroll Pill Filter Wrapper */}
                    <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 mt-4">
                        {tags.map((tag, index) => (
                            <React.Fragment key={tag.ouName}>
                                <button
                                    onClick={() => setSelectedTag(tag.orgId)}
                                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${selectedTag === tag.orgId
                                        ? "bg-white text-emerald-800 shadow-sm"
                                        : index <= 1
                                            ? "border border-emerald-400/40 text-emerald-100/80 hover:bg-white/10"
                                            : "border-none bg-white/10 text-emerald-100/80 hover:bg-white/20"
                                        }`}
                                >
                                    {tag.ouName}
                                </button>
                                {index === 1 && (
                                    <span className="flex select-none items-center px-1 text-sm font-bold text-white/60">·</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="px-6 py-5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kpis.title1}</p>
                        <p className="text-2xl font-bold tracking-tight text-emerald-600">
                            ₹{kpis.fy27YTD.toFixed(2)} <span className="text-sm font-medium text-emerald-500">Cr</span>
                        </p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-emerald-100">
                            <div className="h-full w-full rounded-full bg-emerald-500" />
                        </div>
                    </div>
                    <div className="px-6 py-5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kpis.title2}</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-500">
                            ₹{kpis.fy26Same.toFixed(2)} <span className="text-sm font-medium text-slate-400">Cr</span>
                        </p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-full rounded-full bg-slate-300" />
                        </div>
                    </div>
                    <div className="px-6 py-5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">GROWTH VS PREV FY</p>
                        <div className="flex items-center gap-1.5">
                            <ArrowUpRight className={`h-5 w-5 ${growthIsPositive ? "text-emerald-500" : "text-red-500"}`} strokeWidth={2.5} />
                            <p className={`text-2xl font-bold tracking-tight ${growthIsPositive ? "text-emerald-600" : "text-red-600"}`}>
                                {growthIsPositive ? "+" : ""}{kpis.growth.toFixed(1)}%
                            </p>
                        </div>
                        <p className={`mt-1 text-xs font-medium ${growthIsPositive ? "text-emerald-600/80" : "text-red-600/80"}`}>
                            {growthIsPositive ? "+" : ""}₹{kpis.diff.toFixed(2)} Cr {growthIsPositive ? "surplus" : "deficit"}
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div className="px-6 pt-6 pb-2">
                    <ResponsiveContainer width="100%" height={320}>
                        {activeView === "Year-to-Date" ? (
                            <LineChart data={chartData as any} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey={dataKey} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `₹${Math.round(v)}`} domain={yConfig.domain} ticks={yConfig.ticks} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#f59e0b", strokeWidth: 1 }} />
                                <Line type="monotone" dataKey="fy2526" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="5 5" connectNulls={false} />
                                <Line type="monotone" dataKey="fy2627" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} connectNulls={false} />
                                <ReferenceLine x={todayMonth} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Today", fill: "#f59e0b", fontSize: 9, position: "top", offset: 0 }} />
                            </LineChart>
                        ) : (
                            <BarChart data={chartData as any} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} barCategoryGap="20%" barGap={3}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey={dataKey} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `₹${Math.round(v)}`} domain={yConfig.domain} ticks={yConfig.ticks} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
                                <Bar dataKey="fy2526" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                <Bar dataKey="fy2627" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-2627-${index}`} fill={entry.fy2627 !== null ? "#10b981" : "transparent"} />
                                    ))}
                                </Bar>
                                {activeView === "Month-wise" && (
                                    <ReferenceLine x={todayMonth} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Today", fill: "#f59e0b", fontSize: 9, position: "top", offset: 0 }} />
                                )}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-6 px-6 pt-1 pb-3">
                    {activeView === "Year-to-Date" ? (
                        <>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-6 border-b-2 border-dashed border-slate-500" />
                                <span className="text-[11px] font-medium text-slate-500">FY 2025-26 (Cumulative)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-0.5 w-6 bg-emerald-500" />
                                <span className="text-[11px] font-medium text-slate-500">FY 2026-27 (Cumulative)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-medium text-slate-500">Today cutoff</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-sm bg-slate-400" />
                                <span className="text-[11px] font-medium text-slate-500">FY 2025-26</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                                <span className="text-[11px] font-medium text-slate-500">FY 2026-27</span>
                            </div>
                        </>
                    )}
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

                {/* Footer note */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-[10px] text-slate-400">
                        {activeView === "Year-to-Date"
                            ? "Cumulative YTD running total · FY 2026-27 vs FY 2025-26"
                            : activeView === "Day-wise"
                                ? "Last 10 working days · Current FY vs same days Previous FY"
                                : "Full FY month-by-month · Current FY actual vs Previous FY reference"
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SalesDashboard;