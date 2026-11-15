import { PAGINATION } from './pagination.constants.js';
import type { PaginatedResponse } from './pagination.types.js';
export function isPaginatedResponse<T>(
  value: unknown,
  item: (value: unknown) => value is T,
): value is PaginatedResponse<T> {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value) ||
    !Array.isArray(value.data) ||
    !value.data.every(item) ||
    !('meta' in value) ||
    typeof value.meta !== 'object' ||
    value.meta === null
  )
    return false;
  const meta = value.meta as Record<string, unknown>;
  return (
    ['page', 'pageSize', 'total', 'totalPages'].every(
      (key) => typeof meta[key] === 'number' && Number.isSafeInteger(meta[key]),
    ) &&
    Number(meta.page) >= 1 &&
    Number(meta.pageSize) >= 1 &&
    Number(meta.pageSize) <= PAGINATION.maxPageSize &&
    Number(meta.total) >= 0 &&
    Number(meta.totalPages) ===
      Math.ceil(Number(meta.total) / Number(meta.pageSize)) &&
    value.data.length <= Number(meta.pageSize)
  );
}
