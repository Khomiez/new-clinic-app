// src/hooks/usePagination.ts
import { useState, useMemo } from 'react';

export interface UsePaginationProps {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
  siblingCount?: number; // Number of page buttons to show on each side of current page
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  paginatedItems: <T>(items: T[]) => T[];
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  startIndex: number;
  endIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  pageNumbers: (number | '...')[];
}

export const usePagination = ({
  totalItems,
  itemsPerPage = 10,
  initialPage = 1,
  siblingCount = 1
}: UsePaginationProps): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Calculate start and end indices for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  // Calculate which page numbers to show
  const pageNumbers = useMemo((): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range to show around current page
    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);
    
    // Add left ellipsis if needed
    if (leftSibling > 2) {
      pages.push('...');
    }
    
    // Add pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }
    
    // Add right ellipsis if needed
    if (rightSibling < totalPages - 1) {
      pages.push('...');
    }
    
    // Always show last page (if different from first)
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  }, [currentPage, totalPages, siblingCount]);
  
  const paginatedItems = <T,>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  };
  
  const nextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const prevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  // Reset to first page when total items changes
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalItems, totalPages]);
  
  return {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedItems,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    pageNumbers
  };
};

