export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface CursorPaginationMeta {
  limit: number;
  nextCursor: string | null;
  hasNext: boolean;
}

export function getPaginationParams(
  url: string | URL,
  defaultLimit = 20,
): PaginationParams {
  const parsedUrl = typeof url === "string" ? new URL(url) : url;
  const pageStr = parsedUrl.searchParams.get("page");
  const limitStr = parsedUrl.searchParams.get("limit");

  const page = Math.max(1, pageStr ? parseInt(pageStr, 10) : 1);
  const limit = Math.max(
    1,
    limitStr ? Math.min(100, parseInt(limitStr, 10)) : defaultLimit,
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function getPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getCursorPaginationParams(
  url: string | URL,
  defaultLimit = 20,
): CursorPaginationParams {
  const parsedUrl = typeof url === "string" ? new URL(url) : url;
  const cursor = parsedUrl.searchParams.get("cursor") || undefined;
  const limitStr = parsedUrl.searchParams.get("limit");
  const limit = Math.max(
    1,
    limitStr ? Math.min(100, parseInt(limitStr, 10)) : defaultLimit,
  );

  return { cursor, limit };
}

export function getCursorPaginationMeta<T extends { id: string }>(
  items: T[],
  limit: number,
): CursorPaginationMeta {
  const hasMore = items.length > limit;
  const slicedItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor =
    hasMore && slicedItems.length > 0
      ? slicedItems[slicedItems.length - 1].id
      : null;

  return {
    limit,
    nextCursor,
    hasNext: hasMore,
  };
}
