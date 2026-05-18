import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  SelectionChangedEvent,
  FilterChangedEvent,
  SortChangedEvent,
  PaginationChangedEvent,
} from "ag-grid-community";

// ─── Core Props ───────────────────────────────────────────────────────────────

export interface DataGridProps<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  // Data
  rowData: TData[];
  columnDefs: ColDef<TData>[];

  // Identity
  title?: string;
  gridId?: string; // for localStorage page-size persistence

  // Behavior
  loading?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  rowSelection?: "single" | "multiple" | "none";
  animateRows?: boolean;

  // Toolbar visibility
  showSearch?: boolean;
  showRefreshButton?: boolean;
  showClearFiltersButton?: boolean;
  showExportCsvButton?: boolean;
  showColumnToggle?: boolean;
  showSelectedCount?: boolean;

  // Custom toolbar slots
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;

  // Overlays
  noRowsMessage?: string;
  loadingMessage?: string;

  // Callbacks
  onRefresh?: () => void | Promise<void>;
  onGridReady?: (api: GridApi<TData>) => void;
  onRowClicked?: (event: RowClickedEvent<TData>) => void;
  onSelectionChanged?: (selectedRows: TData[]) => void;
  onFilterChanged?: (event: FilterChangedEvent<TData>) => void;
  onSortChanged?: (event: SortChangedEvent<TData>) => void;
  onPaginationChanged?: (event: PaginationChangedEvent<TData>) => void;
  onExport?: (fileName: string) => void;

  // Styling
  className?: string;
  gridHeight?: string | number;
  compact?: boolean;
  theme?: "light" | "dark";

  // Column defaults override
  defaultColDef?: ColDef<TData>;

  // CSV export options
  exportFileName?: string;
}

// ─── Internal State ───────────────────────────────────────────────────────────

export interface DataGridState {
  quickFilter: string;
  selectedCount: number;
  totalRows: number;
  filteredRows: number;
  currentPage: number;
  totalPages: number;
  activeFiltersCount: number;
  isRefreshing: boolean;
}

// ─── Hook Return ──────────────────────────────────────────────────────────────

export interface UseDataGridReturn {
  gridApiRef: React.MutableRefObject<GridApi | null>;
  state: DataGridState;
  handlers: {
    onGridReady: (event: GridReadyEvent) => void;
    onQuickFilterChange: (value: string) => void;
    onClearFilters: () => void;
    onRefresh: () => Promise<void>;
    onExportCsv: () => void;
    onSelectionChanged: (event: SelectionChangedEvent) => void;
    onFilterChanged: (event: FilterChangedEvent) => void;
    onSortChanged: (event: SortChangedEvent) => void;
    onPaginationChanged: (event: PaginationChangedEvent) => void;
  };
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export interface ToolbarConfig {
  showSearch: boolean;
  showRefresh: boolean;
  showClearFilters: boolean;
  showExportCsv: boolean;
  showSelectedCount: boolean;
}

// ─── Grid Stats (for status bar) ─────────────────────────────────────────────

export interface GridStats {
  total: number;
  filtered: number;
  selected: number;
  page: number;
  totalPages: number;
  activeFilters: number;
}
