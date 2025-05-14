// src/components/ui/Pagination.tsx
import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  showPageSizes?: boolean;
  pageSizeOptions?: number[];
  currentPageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
  startIndex?: number;
  endIndex?: number;
  disabled?: boolean;
  siblingCount?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  showPageSizes = false,
  pageSizeOptions = [5, 10, 25, 50],
  currentPageSize = 10,
  onPageSizeChange,
  totalItems = 0,
  startIndex = 0,
  endIndex = 0,
  disabled = false,
  siblingCount = 1,
}) => {
  // Calculate page numbers to display
  const pageNumbers = React.useMemo((): (number | "...")[] => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 1) return [1];

    // Always show first page
    pages.push(1);

    // Calculate range to show around current page
    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);

    // Add left ellipsis if needed
    if (leftSibling > 2) {
      pages.push("...");
    }

    // Add pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Add right ellipsis if needed
    if (rightSibling < totalPages - 1) {
      pages.push("...");
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, siblingCount]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      {/* Page Size Selector */}
      {showPageSizes && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-600">Show:</span>
          <select
            value={currentPageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="px-3 py-1 border border-blue-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} items
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Page Info */}
      {showInfo && (
        <div className="text-sm text-blue-600 order-first sm:order-none">
          แสดง <span className="font-medium">{startIndex + 1}</span> ถึง{" "}
          <span className="font-medium">{endIndex}</span> จากทั้งหมด{" "}
          <span className="font-medium">{totalItems}</span> รายการ
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
          className="flex items-center px-3 py-2 text-sm border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          aria-label="Previous page"
        >
          <span className="mr-1">←</span>
          หน้าก่อน
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-blue-400"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                disabled={disabled}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  currentPage === page
                    ? "bg-blue-500 text-white font-medium"
                    : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
          className="flex items-center px-3 py-2 text-sm border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          aria-label="Next page"
        >
          หน้าถัดไป
          <span className="ml-1">→</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
