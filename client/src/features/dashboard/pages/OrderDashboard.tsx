import { PageLoader } from '@/shared/components/LoadingSpinner/LoadingSpinner';
import { ArrowUpRight, CheckIcon, X } from "lucide-react";
import React, { useEffect, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getOrderData, getTags } from '../api/axiosClient';

export interface OrderDataByMonthData {
    orgId: number;
    ouName: string;
    fiscalYearPeriod: string;
    yrmn: string;
    mnyr: string;
    orderValue: number;
    migratedAt: Date;
}

/**
 * Derive month display order from API data.
 */
function deriveMonthConfig(monthData: OrderDataByMonthData[]) {
    const prevMonths = monthData
        .filter(d => d.fiscalYearPeriod === "Previous FY" && d.mnyr)
        .map(d => ({ mnyr: d.mnyr, yrmn: d.yrmn }));
    const currMonths = monthData
        .filter(d => d.fiscalYearPeriod === "Current FY" && d.mnyr)
        .map(d => ({ mnyr: d.mnyr, yrmn: d.yrmn }));

    const sortByYrmn = (a: any, b: any) => a.yrmn.localeCompare(b.yrmn);
    const sortedPrev = [...new Map(prevMonths.map(m => [m.mnyr, m])).values()].sort(sortByYrmn);
    const sortedCurr = [...new Map(currMonths.map(m => [m.mnyr, m])).values()].sort(sortByYrmn);

    const prevFyMonths = sortedPrev.map(m => m.mnyr);
    const currFyMonths = sortedCurr.map(m => m.mnyr);

    const mnyrToDisplay = (mnyr: string) => {
        if (!mnyr) return "";
        const parts = mnyr.split("-");
        const monthPart = parts[0];
        if (!monthPart || monthPart.length === 0) return mnyr;
        return monthPart.charAt(0) + monthPart.slice(1).toLowerCase();
    };

    const allMnyr = prevFyMonths.length > 0 ? prevFyMonths : currFyMonths;
    const monthsDisplay = allMnyr.map(mnyrToDisplay);

    return { monthsDisplay, prevFyMonths, currFyMonths };
}

export const OrderDashboard = () => {
    const [tags, setTags] = React.useState<{ orgId: number | null; ouName: string }[]>([{ orgId: null, ouName: "All Units" }]);
    const [selectedTag, setSelectedTag] = React.useState<number | null>(null);
    const [orderData, setOrderData] = React.useState<OrderDataByMonthData[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [inclIntraSales, setInclIntraSales] = React.useState(true);

    const monthConfig = useMemo(() => deriveMonthConfig(orderData), [orderData]);
    const { monthsDisplay, prevFyMonths, currFyMonths } = monthConfig;

    // Fetch full dataset once on mount. Tag filtering is done client-side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getOrderData(null, 'Y');
                setOrderData(data);
                setError(null);
            } catch (err: any) {
                setError(err.message);
                setOrderData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    const toggleIntraSales = async () => {
        setInclIntraSales((previous) => !previous);
        if (inclIntraSales) {
            const data = await getOrderData(selectedTag, "Y");
            setOrderData(data);
        } else {
            const data = await getOrderData(selectedTag, "N");
            setOrderData(data);
        }
    };

    const fetchTagsData = async () => {
        try {
            const tagsRes = await getTags();
            setTags([{ orgId: null, ouName: "All Units" }, ...tagsRes]);
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    }

    useEffect(() => {
        fetchTagsData();
    }, []);

    // --- Filter Helper ---
    const filterByOrg = <T extends { orgId: number }>(data: T[], orgId: number | null): T[] => {
        if (orgId == null) return data;
        return data.filter(item => item.orgId === orgId);
    };

    // --- Month-wise Chart Data ---
    const getMonthWiseData = () => {
        const filtered = filterByOrg(orderData, selectedTag);
        const monthTotals: Record<string, number> = {};
        for (const s of filtered) {
            monthTotals[s.mnyr] = (monthTotals[s.mnyr] || 0) + s.orderValue;
        }
        const allMonths = prevFyMonths.length > 0 ? prevFyMonths : currFyMonths;
        return allMonths.map((mnyr, i) => {
            const displayMonth = monthsDisplay[i] || mnyr;
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
        const filtered = filterByOrg(orderData, selectedTag);
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

    // --- KPIs ---
    const chartData = useMemo(() => getMonthWiseData(), [selectedTag, orderData, monthConfig]);

    const todayMonth = useMemo(() => getTodayMonth(), [selectedTag, orderData, monthConfig]);

    const kpis = useMemo(() => {
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
            fy27YTD,
            fy26Same,
            growth,
            diff: fy27YTD - fy26Same
        };
    }, [selectedTag, orderData, monthConfig]);

    // --- Y Axis Config ---
    const yConfig = useMemo(() => {
        const allValues: number[] = [];
        for (const d of chartData) {
            if (d.fy2526 != null) allValues.push(d.fy2526);
            if (d.fy2627 != null) allValues.push(d.fy2627);
        }
        const maxVal = Math.max(...allValues, 1);
        const yMax = Math.ceil(maxVal / 50) * 50;
        const step = yMax / 4;
        const ticks = [0, step, step * 2, step * 3, step * 4].map(v => Math.round(v));
        return { domain: [0, yMax] as [number, number], ticks };
    }, [chartData]);

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
            <div className="min-w-[200px] rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                <p className="mb-2.5 text-sm font-bold text-slate-800">{label}</p>
                {fy2627Val !== null && (
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-slate-500">FY 2026-27</span>
                        <span className="text-xs font-bold text-indigo-600">₹{Number(fy2627Val).toFixed(2)} Cr</span>
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
                            <ArrowUpRight className={`h-3 w-3 ${isPositive ? "text-emerald-600" : "text-red-600"}`} />
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
        <React.Fragment>
            <div className="min-h-screen mt-6 font-sans">
                <div className="mx-auto overflow-hidden rounded-[8px] bg-white shadow-sm">
                    {/* Header Banner */}
                    <div className="bg-indigo-700 px-6 pt-5 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>
                                <h1 className="text-lg font-bold tracking-tight text-white">Sales Orders — Month-wise Trend</h1>
                            </div>
                            <p className="mt-0.5 text-xs text-indigo-200/60">FY 2026-27 vs FY 2025-26 • ₹ Crores</p>
                        </div>
                        <div className="flex justify-between">
                            <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 mt-3">
                                {tags.map((tag, index) => (
                                    <React.Fragment key={tag.ouName}>
                                        <button
                                            onClick={() => setSelectedTag(tag.orgId)}
                                            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${selectedTag === tag.orgId
                                                ? "bg-white text-indigo-700 shadow-sm"
                                                : index <= 1
                                                    ? "border border-indigo-400/40 text-indigo-100/80 hover:bg-white/10"
                                                    : "border-none bg-white/10 text-indigo-100/80 hover:bg-white/20"
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
                            <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 mt-3">
                                <button
                                    onClick={toggleIntraSales}
                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${inclIntraSales
                                        ? "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-green-600 border border-slate-200"
                                        : "bg-red-50 text-slate-600 hover:bg-red-100 hover:border-red-600 border border-red-200"
                                        }`}
                                >
                                    {inclIntraSales ? <CheckIcon size={14} className="stroke-[2.5]" /> : <X size={14} className="stroke-[2.5]" />}
                                    <span>Incl Intra Sales</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="px-6 py-5">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">FY 2026-27 YTD</p>
                            <p className="text-2xl font-bold tracking-tight text-indigo-600">
                                ₹{kpis.fy27YTD.toFixed(2)} <span className="text-sm font-medium text-indigo-500">Cr</span>
                            </p>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-indigo-100">
                                <div className="h-full w-full rounded-full bg-indigo-500"></div>
                            </div>
                        </div>
                        <div className="px-6 py-5">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">FY 2025-26 SAME PERIOD</p>
                            <p className="text-2xl font-bold tracking-tight text-slate-500">
                                ₹{kpis.fy26Same.toFixed(2)} <span className="text-sm font-medium text-slate-400">Cr</span>
                            </p>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full w-full rounded-full bg-slate-300"></div>
                            </div>
                        </div>
                        <div className="px-6 py-5">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">YOY GROWTH</p>
                            <div className="flex items-center gap-1.5">
                                <ArrowUpRight className={`h-5 w-5 ${growthIsPositive ? "text-emerald-500" : "text-red-500"}`} strokeWidth={2.5} />
                                <p className={`text-2xl font-bold tracking-tight ${growthIsPositive ? "text-emerald-600" : "text-red-600"}`}>
                                    {growthIsPositive ? "+" : ""}{kpis.growth.toFixed(1)}%
                                </p>
                            </div>
                            <p className={`mt-1 text-xs font-medium ${growthIsPositive ? "text-emerald-600/80" : "text-red-600/80"}`}>
                                {growthIsPositive ? "+" : ""}₹{kpis.diff.toFixed(2)} Cr {growthIsPositive ? "ahead" : "behind"}
                            </p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="px-6 pt-6 pb-2">
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={chartData as any} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} barCategoryGap="20%" barGap={3}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `₹${Math.round(v)}`} domain={yConfig.domain} ticks={yConfig.ticks} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
                                <Bar dataKey="fy2526" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                <Bar dataKey="fy2627" fill="#4f46e5" radius={[3, 3, 0, 0]} maxBarSize={24}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-2627-${index}`} fill={entry.fy2627 !== null ? "#4f46e5" : "transparent"} />
                                    ))}
                                </Bar>
                                <ReferenceLine x={todayMonth} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Today", fill: "#f59e0b", fontSize: 10, position: "top", offset: 0 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-6 px-6 pt-1 pb-3">
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-sm bg-slate-400"></div>
                            <span className="text-[11px] font-medium text-slate-500">FY 2025-26</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-sm bg-indigo-500"></div>
                            <span className="text-[11px] font-medium text-slate-500">FY 2026-27</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-5 px-6 pt-0 pb-6">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] font-medium text-slate-400">FY 2026-27 actual</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-400"></div>
                            <span className="text-[10px] font-medium text-slate-400">FY 2025-26 reference</span>
                        </div>
                    </div>

                    {/* Footer note */}
                    <div className="px-6 pb-4 text-center">
                        <p className="text-[10px] text-slate-400">
                            Full FY month-by-month · Current FY actual vs Previous FY reference
                        </p>
                    </div>
                </div>
            </div>
        </React.Fragment>
    )
}
