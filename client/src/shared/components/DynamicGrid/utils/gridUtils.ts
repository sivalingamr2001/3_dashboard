import type { GridApi, ColDef } from "ag-grid-community"

/**
 * Count active column filters from the grid API.
 * Pure enough to be wrapped in tests via mock GridApi.
 */
export function countActiveFilters(api: GridApi | null): number {
  if (!api) return 0
  try {
    const model = api.getFilterModel()
    return Object.keys(model ?? {}).length
  } catch {
    return 0
  }
}

/**
 * Build a safe CSV export file name from a title string.
 */
export function buildExportFileName(title: string, suffix = ""): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  const date = new Date().toISOString().slice(0, 10)
  return suffix ? `${base}_${suffix}_${date}.csv` : `${base}_${date}.csv`
}

/**
 * Merge caller-supplied defaultColDef with safe grid-level defaults.
 * Caller values take precedence.
 */
export function mergeColDef<T>(
  base: ColDef<T>,
  override?: ColDef<T>
): ColDef<T> {
  return { ...base, ...(override ?? {}) }
}

/**
 * Format a number for display (thousand separators).
 */
export function formatCount(n: number): string {
  return n.toLocaleString()
}

/**
 * Debounce — returns a function that only fires after `delay` ms of silence.
 * Fully pure (no external deps), easy to unit-test.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Derive grid height value from string or number prop.
 */
export function resolveGridHeight(height: string | number | undefined): string {
  if (height === undefined) return "480px"
  if (typeof height === "number") return `${height}px`
  return height
}

/**
 * Clamp a page size to a list of allowed sizes.
 */
export function clampPageSize(size: number, allowed: number[]): number {
  if (allowed.includes(size)) return size
  const closest = [...allowed].sort(
    (a, b) => Math.abs(a - size) - Math.abs(b - size)
  )
  return closest[0] ?? allowed[0] ?? 25
}

/**
 * Persist and retrieve page-size preference from localStorage.
 */
export const PageSizeStorage = {
  key: (gridId: string) => `datagrid_page_size_${gridId}`,
  get(gridId: string, fallback: number): number {
    try {
      const v = localStorage.getItem(PageSizeStorage.key(gridId))
      return v ? parseInt(v, 10) : fallback
    } catch {
      return fallback
    }
  },
  set(gridId: string, size: number): void {
    try {
      localStorage.setItem(PageSizeStorage.key(gridId), String(size))
    } catch {
      /* noop – storage unavailable */
    }
  },
}
