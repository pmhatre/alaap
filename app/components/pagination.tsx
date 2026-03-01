import Link from "next/link";
import { PAGE_SIZE } from "@/lib/data/utils";

interface PaginationProps {
  currentPage: number;
  total: number;
  baseHref: string;
  /** Additional search params to preserve */
  searchParams?: Record<string, string>;
}

export function Pagination({
  currentPage,
  total,
  baseHref,
  searchParams = {},
}: PaginationProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  function buildHref(page: number): string {
    const params = new URLSearchParams(searchParams);
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  }

  return (
    <nav className="flex items-center justify-center gap-4 py-6 text-sm">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="rounded px-3 py-1.5 text-stone-600 hover:bg-stone-100"
        >
          &larr; Previous
        </Link>
      ) : (
        <span className="rounded px-3 py-1.5 text-stone-300">
          &larr; Previous
        </span>
      )}
      <span className="text-stone-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="rounded px-3 py-1.5 text-stone-600 hover:bg-stone-100"
        >
          Next &rarr;
        </Link>
      ) : (
        <span className="rounded px-3 py-1.5 text-stone-300">
          Next &rarr;
        </span>
      )}
    </nav>
  );
}
