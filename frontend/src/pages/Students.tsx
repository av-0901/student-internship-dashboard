import { Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, useServerTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';
import { ErrorState } from '../components/States';
import { Card, PageHeader, StatusBadge } from '../components/ui';
import { useApi, useDebounced } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api, downloadExport, errorMessage } from '../services/api';
import type { StudentRow } from '../types';
import { initials } from '../utils/format';

const columns: Column<StudentRow>[] = [
  { key: 'Student_ID', header: 'Student ID', render: (r) => <span className="font-mono text-xs text-slate-500">{r.Student_ID}</span> },
  {
    key: 'Name',
    header: 'Name',
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">{initials(r.Name)}</span>
        <span className="font-medium text-slate-900">{r.Name}</span>
      </div>
    ),
  },
  { key: 'Gender', header: 'Gender' },
  { key: 'Email', header: 'Email', render: (r) => <span className="text-slate-600">{r.Email}</span> },
  { key: 'Contact', header: 'Contact', render: (r) => r.Contact ?? <span className="text-slate-300">—</span> },
  { key: 'City', header: 'City' },
  { key: 'State', header: 'State' },
  { key: 'Country', header: 'Country' },
  { key: 'Company_Count', header: 'Companies', align: 'right' },
  {
    key: 'Internship_Count',
    header: 'Internships',
    align: 'right',
    render: (r) => (
      <span className={`inline-flex min-w-[1.75rem] justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${r.Internship_Count > 1 ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
        {r.Internship_Count}
      </span>
    ),
  },
  { key: 'Latest_Status', header: 'Latest Status', render: (r) => <StatusBadge status={r.Latest_Status} /> },
];

export default function Students() {
  const { filters } = useFilters();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const t = useServerTable('Student_ID');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => t.setPage(1), [q, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload } = useApi(
    () => api.students(filters, { ...t.query, search: q }),
    [JSON.stringify(filters), JSON.stringify(t.query), q],
  );

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadExport('students', filters);
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Student Directory"
        subtitle="One row per unique student. Click a student to open their Student 360 profile."
        actions={
          <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
          </button>
        }
      />
      {exportError && <p className="mb-3 text-sm text-rose-600">{exportError}</p>}
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID, email, contact, city…" className="sm:w-96" />
            <p className="text-xs text-slate-500">{data ? `${data.total} student${data.total === 1 ? '' : 's'}` : ' '}</p>
          </div>
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(r) => r.Student_ID}
            sort={t.sort}
            onSort={t.onSort}
            onRowClick={(r) => navigate(`/student-360/${r.Student_ID}`)}
            loading={loading}
            page={data?.page ?? 1}
            pages={data?.pages ?? 1}
            total={data?.total ?? 0}
            pageSize={t.pageSize}
            onPage={t.setPage}
            onPageSize={t.onPageSize}
            emptyMessage="No students match the search or filters."
          />
        </Card>
      )}
    </>
  );
}
