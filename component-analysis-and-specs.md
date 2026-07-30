# Commodity Custodian — Component Analysis & Refactor Spec

Scope: `AppLayout`, `AppHeader`, `DashboardPage`, `CommodityProvider`, `ItemTable` (rebuilt on a new generic `DataTable`), `StatCards`, `FilterBar`.

Stack confirmed from `package.json`: React 19, react-router-dom 7, ag-grid-community/react 36, Tailwind 4, lucide-react, axios.

---

## 1. Findings from current code

| File | Issue |
|---|---|
| `components/StatCards/` | Stray empty folder + junk file `StatCards/tsx` sitting next to the real `StateCards.tsx`. Component file is misspelled (`StateCards.tsx` exporting `StatCards`) — delete the stray folder, rename file to `StatCards.tsx`. |
| `StateCards.tsx` | Three card blocks are hand-copy-pasted (T1a/T1b/T2) with only colors/keys changed — no map, hard to extend to a 4th track. No empty-state (0 commodities) messaging beyond the loading skeleton. |
| `FilterBar.tsx` | Only the Org dropdown is wired to state. Product dropdown, tag buttons (`All Tags/T1a/T1b/T2`), search input, and "Constrained" button are static/non-functional — they render but call nothing. `totalRows` reflects the *unfiltered* commodities count even after a filter is applied, so the counter is misleading. |
| `ItemsTable.tsx` | All ag-grid setup (column defs, cell renderers, grid options) is inlined directly in the page-level component. Nothing here is reusable for any other grid in the app (e.g., a future PO table or vendor table) — this is the main ask: extract a generic `DataTable`. Also: fixed `h-[505px]` is a magic number instead of filling the parent flex container; `onFilterChange` prop declared in `DashboardPage` usage but never actually implemented/called inside `ItemTable`. |
| `CommodityProvider.tsx` | Solid overall. Minor: `fetchAllCommodities` and `fetchDashboardMetrics` both toggle the *same* `loading` flag, so calling both in one `useEffect` (as `DashboardPage` does) causes flicker/race — last call to finish wins and clears loading even if the other is still in flight. Needs independent loading flags or a single combined fetch. |
| `AppHeader.tsx` | Metric badges (`T1a: 7`, `T1b: 7`, `T2: 8`) and the date are hardcoded strings, not sourced from `dashboardMetrics`/`useCommodity()` — they'll drift from the real dashboard the moment data changes. Alerts button is fully commented out (dead code). |
| `AppLayout.tsx` | Imports and renders `AppFooter` in JSX comment position — actually it does *not* render `<AppFooter />` at all (imported but unused), footer never appears. |
| `DashboardPage.tsx` | Reasonably clean; just needs to consume the refactored `ItemTable`/`DataTable` and get real loading separation from the provider fix above. |

---

## 2. Target component tree

```
AppLayout
 └─ AppHeader (reads live counts from CommodityProvider)
 └─ <Outlet/>
     └─ DashboardPage
         ├─ StatCards        (data-driven, mapped from a config array)
         ├─ FilterBar        (org + search wired to onFilterChange; text/tag filters actually filter)
         └─ ItemTable
             └─ DataTable<T>  (generic ag-grid wrapper — reusable for any dataset)
```

`CommodityProvider` wraps the app (or at least the authenticated route tree) and is the single source of truth for `commodities` and `dashboardMetrics`.

---

## 3. `AppLayout`

Fix: actually render `AppFooter`; keep header/main split with proper flex sizing.

```tsx
// src/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

export const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="w-full shrink-0 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <AppHeader />
        </header>

        <main className="mx-auto flex w-full flex-1 flex-col overflow-hidden bg-[#F8FAFC]">
          <div className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>

        <footer className="w-full shrink-0 border-t border-border/40 bg-background">
          <AppFooter />
        </footer>
      </div>
    </div>
  );
};
```

---

## 4. `AppHeader`

Fix: pull the T1a/T1b/T2 badge counts and date from `useCommodity()` instead of hardcoding them, keep nav callbacks as props for `AppLayout`/router to wire up.

```tsx
// src/layout/AppHeader.tsx
import React from "react";
import { ChevronRight, Cpu, House } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCommodity } from "@/context/CommodityProvider";

const BADGE_STYLE: Record<string, string> = {
  T1a: "bg-red-100 text-red-700 border-red-300",
  T1b: "bg-amber-100 text-amber-700 border-amber-300",
  T2: "bg-slate-100 text-slate-600 border-slate-300",
};

export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const { dashboardMetrics } = useCommodity();

  const badges = [
    { label: "T1a", value: dashboardMetrics?.TOTAL_TRACK_1A },
    { label: "T1b", value: dashboardMetrics?.TOTAL_TRACK_1B },
    { label: "T2", value: dashboardMetrics?.TOTAL_TRACK_2 },
  ];

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5 shrink-0 select-none"
      style={{ background: "linear-gradient(135deg, rgb(76, 29, 149) 0%, rgb(124, 58, 237) 100%)" }}
    >
      <button
        className="flex shrink-0 items-center gap-1 rounded-full p-1.5 text-violet-200 transition-colors hover:bg-white/10"
        title="Home"
        onClick={() => navigate("/")}
      >
        <House className="h-4 w-4" />
      </button>

      <ChevronRight size={11} strokeWidth={2} className="text-violet-400" />
      <Cpu size={15} strokeWidth={2} className="text-violet-300" />

      <div>
        <div className="text-white font-black text-[13px] leading-tight">Commodity Custodian</div>
        <div className="text-violet-300 text-[10px]">Component &amp; Vendor Management</div>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="flex gap-1.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${BADGE_STYLE[b.label]}`}
            >
              {b.label}: {(b.value ?? 0).toLocaleString()}
            </span>
          ))}
        </div>

        <span className="text-[9px] text-violet-300 font-mono">{today}</span>
      </div>
    </div>
  );
};
```

---

## 5. `CommodityProvider`

Fix: split loading flags so dashboard metrics and the grid don't fight over one boolean, and add an `initialized`/combined loader for the page-level effect.

```tsx
// src/context/CommodityProvider.tsx (key changes only — rest unchanged)
const [commoditiesLoading, setCommoditiesLoading] = useState(false);
const [metricsLoading, setMetricsLoading] = useState(false);
const loading = commoditiesLoading || metricsLoading; // keep same public field for consumers

const fetchAllCommodities = useCallback(async () => {
  setCommoditiesLoading(true);
  setError(null);
  try {
    const response = await commodityApi.getAllCommodities();
    setCommodities(response.data || []);
  } catch (err) {
    console.error("Error inside CommodityProvider [fetchAllCommodities]:", err);
    setError("Failed to fetch consolidated commodity datasets.");
  } finally {
    setCommoditiesLoading(false);
  }
}, []);

const fetchDashboardMetrics = useCallback(async (custodianName?: string | null, orgId?: number | null) => {
  setMetricsLoading(true);
  setError(null);
  try {
    const response = await commodityApi.getDashboardMetricsConsolidated(custodianName, orgId);
    setDashboardMetrics(response.data?.[0] || null);
  } catch (err) {
    console.error("Error inside CommodityProvider [fetchDashboardMetrics]:", err);
    setError("Failed to compile dashboard aggregation metrics summaries.");
  } finally {
    setMetricsLoading(false);
  }
}, []);
```

Everything else (isolated modal fetchers, `useCommodity()` hook, context shape) stays as-is — it's already well-structured.

---

## 6. Generic `DataTable<T>` (new, reusable)

Extracts all the ag-grid boilerplate out of `ItemTable` so any future grid (vendor list, PO list, etc.) can reuse it. Owns: theme, default col def, loading/error/empty states, row id, and fills its parent height instead of a hardcoded pixel value.

```tsx
// src/components/DataTable.tsx
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef, type ColGroupDef, type GetRowIdFunc } from "ag-grid-community";
import { useMemo } from "react";

interface DataTableProps<T> {
  rowData: T[];
  columnDefs: (ColDef<T> | ColGroupDef<T>)[];
  getRowId: GetRowIdFunc<T>;
  loading?: boolean;
  error?: string | null;
  context?: Record<string, unknown>;
  headerHeight?: number;
  rowHeight?: number;
  groupHeaderHeight?: number;
  emptyMessage?: string;
}

const DEFAULT_COL_DEF: ColDef = {
  resizable: true,
  suppressMovable: true,
  wrapHeaderText: true,
  autoHeaderHeight: true,
  cellClass: "text-xs",
  headerClass: "text-xs font-semibold text-slate-700",
};

export function DataTable<T>({
  rowData,
  columnDefs,
  getRowId,
  loading,
  error,
  context,
  headerHeight = 34,
  rowHeight = 38,
  groupHeaderHeight = 26,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const defaultColDef = useMemo(() => DEFAULT_COL_DEF, []);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-[300px] w-full items-center justify-center border border-slate-100 bg-white rounded-b-[8px]">
        <span className="text-xs font-semibold text-slate-400 animate-pulse">Loading data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 min-h-[300px] w-full items-center justify-center border border-red-100 bg-red-50 rounded-b-[8px] p-3 text-center">
        <span className="text-xs font-bold text-red-600">{error}</span>
      </div>
    );
  }

  if (rowData.length === 0) {
    return (
      <div className="flex flex-1 min-h-[300px] w-full items-center justify-center border border-slate-100 bg-white rounded-b-[8px]">
        <span className="text-xs font-semibold text-slate-400">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="ag-theme-custom-style flex flex-1 min-h-0 w-full flex-col text-xs rounded-none border border-slate-100 bg-white shadow-[0_12px_24px_-4px_rgba(0,0,0,0.02)]">
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        context={context}
        getRowId={getRowId}
        headerHeight={headerHeight}
        groupHeaderHeight={groupHeaderHeight}
        rowHeight={rowHeight}
        suppressCellFocus
        animateRows
        theme={themeQuartz}
      />
    </div>
  );
}
```

---

## 7. `ItemTable` rebuilt on `DataTable`

Column defs, cell renderers, and modal wiring stay (that part is domain-specific and correct); the grid mechanics now delegate to `DataTable`.

```tsx
// src/pages/ItemsTable.tsx (relevant part only)
import { DataTable } from "@/components/DataTable";
import { COMMODITY_COLUMN_DEFS } from "./commodityColumns"; // move COLUMN_DEFS + cell renderers here
import type { CommodityData } from "@/api/commodityApi";
import { useCallback, useMemo, useState } from "react";
import SupplyModal from "@/components/SupplyModal";
import ProductModal from "@/components/ProductModal";

interface ItemTableProps {
  items: CommodityData[];
  loading: boolean;
  onFilterChange?: (custodianName: string | null) => void;
}

export default function ItemTable({ items, loading }: ItemTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<CommodityData | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalItem, setProductModalItem] = useState<CommodityData | null>(null);

  const handleViewSupply = useCallback((row: CommodityData) => {
    setModalItem(row);
    setModalOpen(true);
  }, []);

  const handleViewProduct = useCallback((row: CommodityData) => {
    setProductModalItem(row);
    setProductModalOpen(true);
  }, []);

  const context = useMemo(
    () => ({ onViewSupply: handleViewSupply, onViewProduct: handleViewProduct }),
    [handleViewSupply, handleViewProduct],
  );

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <DataTable<CommodityData>
        rowData={items}
        columnDefs={COMMODITY_COLUMN_DEFS}
        getRowId={(p) => String(p.data.COMPONENT_ITEM_ID)}
        loading={loading}
        context={context}
        emptyMessage="No commodities match the current filters."
      />

      <SupplyModal
        open={modalOpen}
        organizationId={modalItem?.ORGANIZATION_ID ?? null}
        itemNo={modalItem?.COMPONENT_NO ?? null}
        onClose={() => setModalOpen(false)}
      />
      <ProductModal
        open={productModalOpen}
        organizationId={productModalItem?.ORGANIZATION_ID ?? null}
        organization={productModalItem?.ORG ?? null}
        itemNo={productModalItem?.COMPONENT_NO ?? null}
        onClose={() => { setProductModalOpen(false); setProductModalItem(null); }}
      />
    </div>
  );
}
```

`items`/`loading` now come from `DashboardPage` (via `CommodityProvider`) instead of `ItemTable` doing its own duplicate fetch — the original file fetched data twice (once via its own `useEffect`, once via the provider in `DashboardPage`). Removing the internal fetch also removes the internal `loading`/`error` state duplication.

---

## 8. `StatCards` (data-driven, no copy-paste)

```tsx
// src/components/StatCards.tsx
import React from "react";
import type { DashboardConsolidatedMetrics } from "@/api/commodityApi";

interface StatCardsProps {
  data: DashboardConsolidatedMetrics | null;
  loading?: boolean;
}

interface CardConfig {
  key: string;
  label: string;
  dot: string;
  badge: string;
  total: keyof DashboardConsolidatedMetrics;
  shortage: keyof DashboardConsolidatedMetrics;
  overdue: keyof DashboardConsolidatedMetrics;
  okWhenZero?: boolean;
}

const CARDS: CardConfig[] = [
  { key: "t1a", label: "T1a", dot: "bg-red-500", badge: "text-red-600 bg-red-50 border-red-100",
    total: "TOTAL_TRACK_1A", shortage: "SHORTAGE_TRACK_1A", overdue: "OVERDUE_TRACK_1A" },
  { key: "t1b", label: "T1b", dot: "bg-amber-500", badge: "text-amber-600 bg-amber-50 border-amber-100",
    total: "TOTAL_TRACK_1B", shortage: "SHORTAGE_TRACK_1B", overdue: "OVERDUE_TRACK_1B" },
  { key: "t2", label: "T2", dot: "bg-slate-400", badge: "text-slate-600 bg-slate-50 border-slate-100",
    total: "TOTAL_TRACK_2", shortage: "SHORTAGE_TRACK_2", overdue: "OVERDUE_TRACK_2", okWhenZero: true },
];

export const StatCards: React.FC<StatCardsProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex w-full items-stretch justify-between gap-2 font-sans animate-pulse">
        {CARDS.map((c) => (
          <div key={c.key} className="flex-1 bg-slate-100/50 border border-slate-200 shadow-sm rounded-lg h-[82px] min-w-[140px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full items-stretch justify-between gap-2 font-sans select-none">
      {CARDS.map((c) => {
        const shortage = (data[c.shortage] as number) ?? 0;
        const overdue = (data[c.overdue] as number) ?? 0;
        return (
          <div key={c.key} className="flex-1 bg-white border border-gray-100 shadow-sm rounded-lg p-2 flex flex-col justify-between min-w-[140px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className={`px-2 py-0.5 font-bold text-xs rounded-md border ${c.badge}`}>{c.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-800">{((data[c.total] as number) ?? 0).toLocaleString()}</span>
            </div>
            <div className="mt-2 text-xs space-y-1">
              <div className={`flex items-center gap-1 font-semibold ${shortage === 0 && c.okWhenZero ? "text-emerald-600" : "text-red-600"}`}>
                <span>📦</span> {shortage === 0 && c.okWhenZero ? "stock OK" : `${shortage.toLocaleString()} shortage`}
              </div>
              <div className={`flex items-center gap-1 font-semibold ${overdue === 0 && c.okWhenZero ? "text-slate-400" : "text-amber-600"}`}>
                <span>🕒</span> {overdue === 0 && c.okWhenZero ? "on sched" : `${overdue.toLocaleString()} Pending Overdue`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

Delete `src/components/StatCards/` (the empty folder + stray `tsx` file) once this replaces `StateCards.tsx`.

---

## 9. `FilterBar` (search + tags actually wired)

```tsx
// src/components/FilterBar.tsx
import type { CommodityData } from "@/api/commodityApi";
import { Building2, ChevronDown, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface FilterState {
  orgId: number | null;
  tag: "ALL" | "T1a" | "T1b" | "T2";
  constrainedOnly: boolean;
  search: string;
}

interface FilterBarProps {
  tableData: CommodityData[];
  totalRows: number;
  onFilterChange: (filters: FilterState) => void;
}

const TAGS: FilterState["tag"][] = ["ALL", "T1a", "T1b", "T2"] as any;

export default function FilterBar({ tableData, totalRows, onFilterChange }: FilterBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ orgId: null, tag: "ALL", constrainedOnly: false, search: "" });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const orgOptions = useMemo(() => {
    const uniqueMap = new Map<number, string>();
    tableData.forEach((row) => {
      if (row.ORGANIZATION_ID != null && row.ORG) uniqueMap.set(row.ORGANIZATION_ID, row.ORG.trim());
    });
    const sorted = Array.from(uniqueMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    return [{ id: null as number | null, label: "All Orgs" }, ...sorted];
  }, [tableData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const update = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFilterChange(next);
  };

  const selectedOrgLabel = orgOptions.find((o) => o.id === filters.orgId)?.label ?? "All Orgs";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shrink-0 flex-wrap shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] select-none">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1 bg-white hover:border-violet-400 transition-colors min-w-[130px] text-slate-700"
        >
          <Building2 size={12} className="text-violet-500 shrink-0" />
          <span className="truncate">{selectedOrgLabel}</span>
          <ChevronDown size={11} className="ml-auto text-slate-400 shrink-0" />
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 mt-1 w-48 bg-white border border-slate-100 shadow-lg rounded-lg py-1 z-30 text-xs max-h-56 overflow-y-auto">
            {orgOptions.map((org) => (
              <button
                key={org.id ?? "all"}
                type="button"
                onClick={() => { update({ orgId: org.id }); setDropdownOpen(false); }}
                className={`w-full text-left px-3 py-1.5 font-medium hover:bg-slate-50 block ${
                  filters.orgId === org.id ? "text-violet-600 bg-violet-50/50 font-bold" : "text-slate-600"
                }`}
              >
                {org.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => update({ tag })}
          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
            filters.tag === tag ? "bg-slate-700 text-white border-slate-700" : "text-slate-500 border-slate-200 hover:border-slate-400 bg-white"
          }`}
        >
          {tag === "ALL" ? "All Tags" : tag}
        </button>
      ))}

      <button
        onClick={() => update({ constrainedOnly: !filters.constrainedOnly })}
        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
          filters.constrainedOnly ? "text-white bg-red-500 border-red-500" : "text-red-500 border-red-200 bg-red-50 hover:border-red-400"
        }`}
      >
        <ShieldAlert size={11} />
        Constrained
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Search size={12} className="text-slate-400" />
        <input
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Code / desc…"
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 w-32 focus:outline-none focus:border-violet-400 bg-slate-50"
        />
      </div>

      <span className="text-xs text-slate-400 font-semibold shrink-0 pl-1">{totalRows.toLocaleString()} items</span>
    </div>
  );
}
```

`totalRows` should now be computed in `DashboardPage` from the **filtered** list, not the raw `commodities.length`, so the counter matches what's actually shown in the grid.

---

## 10. `DashboardPage` (wiring it together)

```tsx
// src/pages/DashboardPage.tsx
import { useEffect, useMemo, useCallback } from "react";
import { useState } from "react";
import FilterBar, { type FilterState } from "@/components/FilterBar";
import { StatCards } from "@/components/StatCards";
import ItemTable from "./ItemsTable";
import { useCommodity } from "@/context/CommodityProvider";

const emptyFilters: FilterState = { orgId: null, tag: "ALL", constrainedOnly: false, search: "" };

export const DashboardPage = () => {
  const { commodities, dashboardMetrics, loading, error, fetchAllCommodities, fetchDashboardMetrics } = useCommodity();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  useEffect(() => {
    fetchAllCommodities();
  }, [fetchAllCommodities]);

  useEffect(() => {
    fetchDashboardMetrics(null, filters.orgId);
  }, [fetchDashboardMetrics, filters.orgId]);

  const filteredItems = useMemo(() => {
    return commodities.filter((row) => {
      if (filters.orgId != null && row.ORGANIZATION_ID !== filters.orgId) return false;
      if (filters.constrainedOnly && row.CONSTRAINT_FLAG !== "CONSTRAINT") return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!row.COMPONENT_NO?.toLowerCase().includes(q) && !row.DESCRIPTION?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [commodities, filters]);

  const handleFilterChange = useCallback((next: FilterState) => setFilters(next), []);

  return (
    <div className="flex w-full flex-col gap-4 p-6 bg-slate-50/50 min-h-full">
      <StatCards data={dashboardMetrics} loading={loading} />

      <FilterBar tableData={commodities} totalRows={filteredItems.length} onFilterChange={handleFilterChange} />

      <div className="flex flex-1 min-h-0 w-full flex-col rounded-xl border border-slate-100 bg-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
        {error ? (
          <div className="flex h-[300px] w-full items-center justify-center p-4 text-center">
            <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg">{error}</span>
          </div>
        ) : (
          <ItemTable items={filteredItems} loading={loading} />
        )}
      </div>
    </div>
  );
};
```

---

## 11. Cleanup checklist

- [ ] Delete `src/components/StatCards/` (empty folder + `tsx` stray file).
- [ ] Rename `StateCards.tsx` → `StatCards.tsx`, update the one import in `DashboardPage`.
- [ ] Add `src/components/DataTable.tsx` (generic, new).
- [ ] Move `COLUMN_DEFS` + cell renderers out of `ItemsTable.tsx` into `src/pages/commodityColumns.tsx` so `ItemTable` only does orchestration.
- [ ] Remove the duplicate internal fetch inside `ItemTable` — data now flows down from `DashboardPage`/`CommodityProvider` only.
- [ ] Split `loading`/`metricsLoading` in `CommodityProvider`.
- [ ] Wire `AppFooter` into `AppLayout` (currently imported but never rendered).
- [ ] Point `AppHeader` badges at live `dashboardMetrics` instead of hardcoded numbers.
