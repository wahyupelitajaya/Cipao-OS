import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface PaginationBarProps {
  totalCount: number;
  page: number;
  pageSize: number;
  basePath: string;
  /** Optional search params to preserve in prev/next links (e.g. { q: "foo" }) */
  searchParams?: Record<string, string>;
}

function buildQuery(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  const s = search.toString();
  return s ? `?${s}` : "";
}

export function PaginationBar({
  totalCount,
  page,
  pageSize,
  basePath,
  searchParams = {},
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const prevQuery = buildQuery({ ...searchParams, page: String(prevPage!) });
  const nextQuery = buildQuery({ ...searchParams, page: String(nextPage!) });

  if (totalCount <= pageSize && page === 1) return null;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground">
        Menampilkan {from}–{to} dari {totalCount}
      </p>
      <div className="flex items-center gap-2">
        {prevPage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${basePath}${prevQuery}`}>Sebelumnya</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Sebelumnya
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          Halaman {page} dari {totalPages}
        </span>
        {nextPage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${basePath}${nextQuery}`}>Selanjutnya</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Selanjutnya
          </Button>
        )}
      </div>
    </nav>
  );
}
