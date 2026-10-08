import { Briefcase, Building2, Download, Layers, Loader2, Repeat, Sigma } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChartCard, DonutChart, HBarChart, TimelineChart, VBarChart } from '../charts/Charts';
import { DataTable, useServerTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';
import { ErrorState, PageSkeleton } from '../components/States';
import { Card, CardHeader, KpiCard, PageHeader, StatusBadge } from '../components/ui';
import { useApi, useDebounced } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api, downloadExport, errorMessage } from '../services/api';
import type { Row } from '../types';
import { CHART_COLORS, fmtDate, fmtINR, fmtNumber } from '../utils/format';

export function stipendCell(r: Row) {
  if (r.Stipend !== null && r.Stipend !== undefined) return fmtINR(r.Stipend as number);
  if (r.Stipend_Currency && r.Stipend_Currency !== 'INR')
    return <span className="text-amber-700" title="Non-INR stipend; excluded from INR analytics">{String(r.Stipend_Raw)}</span>;
  return <span className="text-slate-400" title="Stipend not recorded">Not recorded</span>;
}

const columns: Column<Row>[] = [
  { key: 'Internship_ID', header: 'ID', render: (r) => <span className="font-mono text-xs text-slate-500">{String(r.Internship_ID)}</span> },
  {
    key: 'Name',
    header: 'Student',
    render: (r) => (
      <Link to={`/student-360/${r.Student_ID}`} className="link" onClick={(e) => e.stopPropagation()}>
        {String(r.Name)}
      </Link>
    ),
  },
  { key: 'Company', header: 'Company', render: (r) => <span className="font-medium text-slate-800">{String(r.Company ?? '—')}</span> },
  { key: 'Role', header: 'Role' },
  { key: 'Joining_Location', header: 'Location' },
  { key: '_date', header: 'Joining Date', render: (r) => fmtDate(r.Joining_Date as string) },
  { key: 'Status', header: 'Status', render: (r) => <StatusBadge status={r.Status as string} /> },
  { key: 'Stipend', header: 'Stipend / mo', align: 'right', render: stipendCell },
  { key: 'Tenure_Months', header: 'Tenure', align: 'right', render: (r) => (r.Tenure_Months !== null ? `${r.Tenure_Months} mo` : '—') },
];

export default function Internships() {
  const { filters, setFilter } = useFilters();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const t = useServerTable('_date', 'desc', 10);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => t.setPage(1), [q, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload } = useApi(
    () => api.internships(filters, { ...t.query, search: q }),
    [JSON.stringify(filters), JSON.stringify(t.query), q],
  );

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadExport('internships', filters);
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  const { kpis, charts, records } = data;

  return (
    <>
      <PageHeader
        title="Internship Analytics"
        subtitle="Every legitimate internship / professional record — students with several internships keep every record"
        actions={
          <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
          </button>
        }
      />
      {exportError && <p className="mb-3 text-sm text-rose-600">{exportError}</p>}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Internship Records" value={fmtNumber(kpis.total_records)} icon={Briefcase} />
          <KpiCard label="Unique Companies" value={fmtNumber(kpis.unique_companies)} icon={Building2} tone="amber" />
          <KpiCard label="Unique Roles" value={fmtNumber(kpis.unique_roles)} icon={Layers} tone="teal" />
          <KpiCard label="Avg per Student" value={fmtNumber(kpis.avg_internships_per_student, 2)} icon={Sigma} tone="slate" hint="Students with ≥1 record" />
          <KpiCard label="Multiple Internships" value={fmtNumber(kpis.students_with_multiple)} icon={Repeat} tone="violet" hint="Students with 2+ records" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Top Companies" subtitle="Click to filter" height={320} empty={!charts.top_companies.length}>
            <HBarChart data={charts.top_companies} onClick={(c) => setFilter('company', c)} labelWidth={170} />
          </ChartCard>
          <ChartCard title="Top Roles" subtitle="Click to filter" height={320} empty={!charts.top_roles.length}>
            <HBarChart data={charts.top_roles} color={CHART_COLORS[1]} onClick={(r) => setFilter('role', r)} labelWidth={200} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Internship Status" empty={!charts.status.length}>
            <DonutChart data={charts.status} centerLabel="Records" onClick={(s) => setFilter('status', s)} />
          </ChartCard>
          <ChartCard title="Joining Location" subtitle="Click to filter" empty={!charts.joining_locations.length}>
            <HBarChart data={charts.joining_locations} color={CHART_COLORS[5]} onClick={(l) => setFilter('joining_location', l)} labelWidth={130} />
          </ChartCard>
          <ChartCard title="Tenure (months)" subtitle="Planned internship duration" empty={!charts.tenure.length}>
            <VBarChart data={charts.tenure} color={CHART_COLORS[3]} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Joining Month" className="lg:col-span-2" empty={!charts.joining_months.length}>
            <TimelineChart data={charts.joining_months} color={CHART_COLORS[1]} />
          </ChartCard>
          <ChartCard title="Work Mode" subtitle="Parsed from joining location" empty={!charts.work_mode.length}>
            <DonutChart data={charts.work_mode} centerLabel="Records" />
          </ChartCard>
        </div>

        <Card>
          <CardHeader
            title="Internship Records"
            subtitle={`${records.total} record${records.total === 1 ? '' : 's'} · click a row to open Student 360`}
            actions={<SearchInput value={search} onChange={setSearch} placeholder="Search student, company, role…" className="w-64" />}
          />
          <DataTable
            columns={columns}
            rows={records.items}
            rowKey={(r) => String(r.Internship_ID)}
            sort={t.sort}
            onSort={t.onSort}
            onRowClick={(r) => navigate(`/student-360/${r.Student_ID}`)}
            loading={loading}
            page={records.page}
            pages={records.pages}
            total={records.total}
            pageSize={t.pageSize}
            onPage={t.setPage}
            onPageSize={t.onPageSize}
          />
        </Card>
      </div>
    </>
  );
}
