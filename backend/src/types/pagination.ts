export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/** Standard list envelope used by every paged endpoint. */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}