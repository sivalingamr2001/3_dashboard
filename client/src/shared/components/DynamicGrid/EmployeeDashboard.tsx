/**
 * Example: EmployeeDashboard.tsx
 *
 * Shows three configurations of the same <DataGrid /> component:
 *   1. Basic usage
 *   2. Full-featured with all toolbar options
 *   3. Compact read-only view
 *
 * Paste this into your app, adjust imports, and it works.
 */

import { useCallback, useRef, useState } from "react";
import type { ColDef, GridApi, ICellRendererParams } from "ag-grid-community";
import { DataGrid } from "./DataGrid";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  salary: number;
  status: "Active" | "Inactive" | "On Leave";
  experience: number;
  joinDate: string;
  performance: number;
}

// ─── Cell Renderers ───────────────────────────────────────────────────────────

const StatusCell = (params: ICellRendererParams<Employee>) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    Active: { bg: "#ebfbee", text: "#2f9e44" },
    Inactive: { bg: "#fff5f5", text: "#c92a2a" },
    "On Leave": { bg: "#fff9db", text: "#e67700" },
  };
  const s = colorMap[params.value ?? ""] ?? { bg: "#f1f3f5", text: "#495057" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {params.value}
    </span>
  );
};

const SalaryCell = (params: ICellRendererParams<Employee>) =>
  params.value != null ? `₹${(params.value as number).toLocaleString("en-IN")}` : "—";

const PerformanceCell = (params: ICellRendererParams<Employee>) => {
  const pct: number = params.value ?? 0;
  const color = pct >= 80 ? "#2f9e44" : pct >= 60 ? "#e67700" : "#c92a2a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "#f1f3f5",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
          }}
        />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, minWidth: 28 }}>{pct}%</span>
    </div>
  );
};

// ─── Column definitions ───────────────────────────────────────────────────────

const EMPLOYEE_COLUMNS: ColDef<Employee>[] = [
  {
    field: "id",
    headerName: "#",
    width: 65,
    pinned: "left",
    checkboxSelection: true,
    headerCheckboxSelection: true,
    cellStyle: { color: "var(--color-text-secondary)", fontSize: 12 },
  },
  {
    field: "name",
    headerName: "Name",
    flex: 1.5,
    minWidth: 140,
    filter: "agTextColumnFilter",
    cellStyle: { fontWeight: 500 },
  },
  {
    field: "department",
    headerName: "Department",
    flex: 1,
    minWidth: 120,
    filter: "agSetColumnFilter",
  },
  {
    field: "role",
    headerName: "Role",
    flex: 1.5,
    minWidth: 160,
    filter: "agTextColumnFilter",
  },
  {
    field: "salary",
    headerName: "Salary",
    flex: 1,
    minWidth: 110,
    filter: "agNumberColumnFilter",
    cellRenderer: SalaryCell,
  },
  {
    field: "experience",
    headerName: "Exp (yrs)",
    width: 100,
    filter: "agNumberColumnFilter",
    type: "numericColumn",
  },
  {
    field: "status",
    headerName: "Status",
    width: 110,
    filter: "agSetColumnFilter",
    cellRenderer: StatusCell,
  },
  {
    field: "performance",
    headerName: "Performance",
    flex: 1,
    minWidth: 150,
    filter: "agNumberColumnFilter",
    cellRenderer: PerformanceCell,
  },
  {
    field: "joinDate",
    headerName: "Joined",
    width: 110,
    filter: "agTextColumnFilter",
  },
];

// ─── Sample data generator ────────────────────────────────────────────────────

let _id = 1;
const DEPTS = ["Engineering", "Product", "Design", "HR", "Finance", "Sales"];
const ROLES = [
  "Senior Engineer",
  "Product Manager",
  "UX Designer",
  "HR Analyst",
  "Finance Lead",
  "Sales Executive",
];
const STATUSES: Employee["status"][] = [
  "Active",
  "Active",
  "Active",
  "Inactive",
  "On Leave",
];
const NAMES = [
  "Arjun Kumar",
  "Priya Sharma",
  "Rohan Patel",
  "Ananya Singh",
  "Vikram Reddy",
  "Deepa Iyer",
  "Kiran Nair",
  "Sneha Gupta",
  "Rahul Joshi",
  "Meera Mehta",
];

function makeEmployee(): Employee {
  const di = Math.floor(Math.random() * DEPTS.length);
  return {
    id: _id++,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    department: DEPTS[di],
    role: ROLES[di],
    salary: Math.floor(Math.random() * 2100000) + 400000,
    status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
    experience: Math.floor(Math.random() * 17) + 1,
    joinDate: new Date(
      2016 + Math.floor(Math.random() * 8),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ).toLocaleDateString("en-IN"),
    performance: Math.floor(Math.random() * 40) + 60,
  };
}

const INITIAL_DATA: Employee[] = Array.from({ length: 120 }, makeEmployee);

// ─── Page component ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const [rows, setRows] = useState<Employee[]>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const gridApiRef = useRef<GridApi<Employee> | null>(null);

  // Simulated async refresh
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRows(Array.from({ length: 120 }, makeEmployee));
    setLoading(false);
  }, []);

  const handleAddRow = useCallback(() => {
    setRows((prev) => [makeEmployee(), ...prev]);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const ids = new Set(selectedEmployees.map((e) => e.id));
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    setSelectedEmployees([]);
  }, [selectedEmployees]);

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ── Example 1: Full featured ─────────────────────────────────────── */}
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Employee Registry
      </h1>

      <DataGrid<Employee>
        gridId="employee-registry" // unique id for localStorage persistence
        title="Employees"
        rowData={rows}
        columnDefs={EMPLOYEE_COLUMNS}
        loading={loading}
        gridHeight={520}
        pageSizeOptions={[10, 25, 50, 100]}
        pageSize={25}
        rowSelection="multiple"
        showSearch
        showRefreshButton
        showClearFiltersButton
        showExportCsvButton
        showSelectedCount
        exportFileName="employees.csv"
        noRowsMessage="No employees match your search"
        onRefresh={handleRefresh}
        onGridReady={(api) => {
          gridApiRef.current = api;
        }}
        onSelectionChanged={setSelectedEmployees}
        onRowClicked={(e) => console.log("Clicked:", e.data)}
        /* Inject extra toolbar buttons on the right */
        toolbarRight={
          <>
            <button
              onClick={handleAddRow}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 500,
                border: "0.5px solid #2f9e44",
                borderRadius: 7,
                cursor: "pointer",
                background: "transparent",
                color: "#2f9e44",
              }}
            >
              + Add Row
            </button>
            {selectedEmployees.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "0.5px solid rgba(201,42,42,0.4)",
                  borderRadius: 7,
                  cursor: "pointer",
                  background: "transparent",
                  color: "#c92a2a",
                }}
              >
                Delete ({selectedEmployees.length})
              </button>
            )}
          </>
        }
      />

      {/* ── Example 2: Minimal / read-only ──────────────────────────────── */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 40, marginBottom: 16 }}>
        Recent Joiners (compact, read-only)
      </h2>

      <DataGrid<Employee>
        gridId="recent-joiners"
        title="Recent Joiners"
        rowData={rows.slice(0, 20)}
        columnDefs={[
          { field: "name", headerName: "Name", flex: 1, cellStyle: { fontWeight: 500 } },
          { field: "department", headerName: "Dept", width: 130 },
          { field: "role", headerName: "Role", flex: 1 },
          { field: "joinDate", headerName: "Joined", width: 110 },
          { field: "status", headerName: "Status", width: 110, cellRenderer: StatusCell },
        ]}
        gridHeight={300}
        compact // 32px rows
        rowSelection="none"
        showSearch={false}
        showRefreshButton={false}
        showClearFiltersButton={false}
        showExportCsvButton={false}
        showSelectedCount={false}
        pageSizeOptions={[10, 20]}
        pageSize={10}
      />
    </div>
  );
}

/**
 * ─── Minimum viable usage (copy-paste ready) ─────────────────────────────────
 *
 * import { DataGrid } from "@/components/DataGrid";
 * import type { ColDef } from "ag-grid-community";
 *
 * interface Product { id: number; name: string; price: number; }
 *
 * const cols: ColDef<Product>[] = [
 *   { field: "id",    headerName: "#",     width: 60  },
 *   { field: "name",  headerName: "Name",  flex: 1    },
 *   { field: "price", headerName: "Price", flex: 1,
 *     valueFormatter: (p) => `$${p.value}` },
 * ];
 *
 * export default function ProductPage() {
 *   return (
 *     <DataGrid<Product>
 *       title="Products"
 *       rowData={myProductArray}
 *       columnDefs={cols}
 *       onRefresh={fetchProducts}
 *     />
 *   );
 * }
 */
