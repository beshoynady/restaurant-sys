/**
 * TS placeholder for server/utils/pagination.js
 * Kept minimal since pagination logic may be used across many modules.
 * Convert additional pagination utilities file-by-file when needed.
 */
export type PaginationOptions = {
  page?: number;
  limit?: number;
};

export function getPagination({
  page = 1,
  limit = 10,
}: PaginationOptions = {}): { skip: number; limit: number; page: number } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}
