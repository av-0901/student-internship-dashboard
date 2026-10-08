import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from './States';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export interface SortState {
  sortBy?: string;
  sortDir: 'asc' | 'desc';
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  sort?: SortState;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  page?: number;
  pages?: number;
  total?: number;
  pageSize?: number;
  onPage?: (p: number) => void;
  onPageSize?: (n: number) => void;
  emptyMessage?: string;
  maxHeight?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  onRowClick,
  loading,
  page,
  pages,
  total,
  pageSize,
  onPage,
  onPageSize,
  emptyMessage,
  maxHeight,
}: Props<T>) {
  const alignClass = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div className="relative">
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr className="border-b border-slate-200">
              {columns.map((c) => {
                const active = sort?.sortBy === c.key;
                const sortable = c.sortable !== false && !!onSort;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${alignClass(c.align)}`}
                    aria-sort={active ? (sort?.sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {sortable ? (
                      <button
                        onClick={() => onSort!(c.key)}
                        className={`inline-flex items-center gap-1 hover:text-slate-800 ${active ? 'text-slate-800' : ''}`}
                      >
                        {c.header}
                        {active ? (
                          sort?.sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr
                key={rowKey(r, i)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : ''} transition-colors hover:bg-brand-50/40`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-4 py-2.5 text-slate-700 ${alignClass(c.align)} ${c.className ?? ''}`}>
                    {c.render ? c.render(r) : ((r as Record<string, unknown>)[c.key] as ReactNode) ?? <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <EmptyState title="No records" message={emptyMessage} />}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        </div>
      )}
      {page !== undefined && pages !== undefined && onPage && (
        <Pagination page={page} pages={pages} total={total ?? rows.length} pageSize={pageSize} onPage={onPage} onPageSize={onPageSize} />
      )}
    </div>
  );
}

function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize?: number;
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * (pageSize ?? 0) + 1;
  const to = Math.min(total, page * (pageSize ?? total));
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 sm:flex-row">
      <span>
        Showing <b className="text-slate-700">{from}</b>–<b className="text-slate-700">{to}</b> of{' '}
        <b className="text-slate-700">{total}</b>
      </span>
      <div className="flex items-center gap-3">
        {onPageSize && (
          <label className="flex items-center gap-1.5">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button className="pager-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 tabular-nums">
            Page {page} / {pages}
          </span>
          <button className="pager-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sorting / searching / paging for small, already-loaded tables. */
export function useClientTable<T extends Record<string, unknown>>(rows: T[], initialSort?: string, initialPageSize = 10) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ sortBy: initialSort, sortDir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = term ? rows.filter((r) => Object.values(r).some((v) => v !== null && String(v).toLowerCase().includes(term))) : rows;
    if (sort.sortBy) {
      const k = sort.sortBy;
      const dir = sort.sortDir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => {
        const x = a[k];
        const y = b[k];
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
      });
    }
    return out;
  }, [rows, search, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  return {
    search,
    setSearch: (s: string) => {
      setSearch(s);
      setPage(1);
    },
    filtered,
    tableProps: {
      rows: filtered.slice((current - 1) * pageSize, current * pageSize),
      sort,
      onSort: (key: string) => setSort((s) => ({ sortBy: key, sortDir: s.sortBy === key && s.sortDir === 'asc' ? 'desc' : 'asc' })),
      page: current,
      pages,
      total: filtered.length,
      pageSize,
      onPage: setPage,
      onPageSize: (n: number) => {
        setPageSize(n);
        setPage(1);
      },
    },
  };
}

/** Sort + paging state for server-side tables. */
export function useServerTable(initialSort: string, initialDir: 'asc' | 'desc' = 'asc', initialPageSize = 25) {
  const [sort, setSort] = useState<SortState>({ sortBy: initialSort, sortDir: initialDir });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  return {
    sort,
    page,
    pageSize,
    setPage,
    query: { sort_by: sort.sortBy, sort_dir: sort.sortDir, page, page_size: pageSize },
    onSort: (key: string) => {
      setSort((s) => ({ sortBy: key, sortDir: s.sortBy === key && s.sortDir === 'asc' ? 'desc' : 'asc' }));
      setPage(1);
    },
    onPageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
  };
}
