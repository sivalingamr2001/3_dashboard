import React, { useCallback, useEffect } from "react";
import type { GridApi } from "ag-grid-community";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { PageSizeStorage } from "../../utils/gridUtils";

interface GridFooterProps {
  gridApiRef: React.MutableRefObject<GridApi | null>;
  gridId: string;
  pageSize: number;
  pageSizeOptions: number[];
  currentPage: number;
  totalPages: number;
  selectedCount: number;
  showSelectedCount: boolean;
  onPageSizeChange?: (size: number) => void;
}

export const GridFooter: React.FC<GridFooterProps> = ({
  gridApiRef,
  gridId,
  pageSize,
  pageSizeOptions,
  currentPage,
  totalPages,
  selectedCount,
  showSelectedCount,
  onPageSizeChange,
}) => {
  const [currentSize, setCurrentSize] = React.useState(String(pageSize));

  useEffect(() => {
    setCurrentSize(String(pageSize));
  }, [pageSize]);

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const size = Number(value);
      setCurrentSize(value);

      gridApiRef.current?.setGridOption("paginationPageSize", size);
      PageSizeStorage.set(gridId, size);

      onPageSizeChange?.(size);
    },
    [gridApiRef, gridId, onPageSizeChange],
  );

  const handlePreviousPage = useCallback(() => {
    gridApiRef.current?.paginationGoToPreviousPage();
  }, [gridApiRef]);

  const handleNextPage = useCallback(() => {
    gridApiRef.current?.paginationGoToNextPage();
  }, [gridApiRef]);

  const handleClearSelection = useCallback(() => {
    gridApiRef.current?.deselectAll();
  }, [gridApiRef]);

  return (
    <div className="datagrid-footer border-border text-muted-foreground flex flex-col gap-3 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      {/* Left Section */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs">Rows per page</span>

        <Select value={currentSize} onValueChange={handlePageSizeChange}>
          <SelectTrigger size="sm" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Show only when rows selected */}
        {showSelectedCount && selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
              {selectedCount} selected
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-xs tabular-nums">
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : "0 / 0"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextPage}
            disabled={totalPages === 0 || currentPage >= totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
