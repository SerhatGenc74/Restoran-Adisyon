import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginate<T>(data: T[], total: number, query: PaginationQuery): PaginatedResult<T> {
  return {
    data,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit)
  };
}

export function getOffset(query: PaginationQuery): number {
  return (query.page - 1) * query.limit;
}
