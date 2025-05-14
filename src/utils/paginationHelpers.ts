// src/utils/paginationHelpers.ts
import { PaginationParams, PaginatedResponse } from "@/interfaces/IPagination";

export function buildPaginationQuery(
  params: PaginationParams,
  searchFields: string[] = []
) {
  const { page = 1, limit = 10, search, sortBy, sortOrder = "desc" } = params;

  // Build search query
  let query: any = {};
  if (search && searchFields.length > 0) {
    query.$or = searchFields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }));
  }

  // Calculate skip value
  const skip = (page - 1) * limit;

  // Build sort object
  let sort: any = {};
  if (sortBy) {
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    // Default sort by creation date
    sort.createdAt = -1;
  }

  return {
    query,
    skip,
    limit,
    sort,
    page,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
