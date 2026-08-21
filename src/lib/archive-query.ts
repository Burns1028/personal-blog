export function normalizeSearch(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function matchesSearch(
  fields: Array<string | undefined>,
  raw: string,
): boolean {
  const query = normalizeSearch(raw).toLocaleLowerCase("zh-CN");
  if (!query) return true;
  return fields
    .filter((field): field is string => Boolean(field))
    .join("\n")
    .toLocaleLowerCase("zh-CN")
    .includes(query);
}

export function paginate<T>(
  items: T[],
  requestedPage: number,
  pageSize: number,
) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(
    pageCount,
    Math.max(
      1,
      Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1,
    ),
  );
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageCount,
    total: items.length,
  };
}

export type PaginationItem = number | "ellipsis";

export function paginationItems(
  requestedPage: number,
  requestedPageCount: number,
): PaginationItem[] {
  const pageCount = Math.max(1, Math.trunc(requestedPageCount));
  const page = Math.min(
    pageCount,
    Math.max(1, Math.trunc(requestedPage)),
  );

  if (pageCount <= 4) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 3) return [1, 2, 3, "ellipsis", pageCount];
  if (page >= pageCount - 2) {
    return [1, "ellipsis", pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, "ellipsis", page, "ellipsis", pageCount];
}

export function pageHref(
  pathname: string,
  page: number,
  query: string,
): string {
  const params = new URLSearchParams();
  if (normalizeSearch(query)) params.set("q", normalizeSearch(query));
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
