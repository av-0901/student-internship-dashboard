import { AlertTriangle, CalendarX, Copy, Database, FileWarning, Layers, Repeat, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChartCard, HBarChart } from '../charts/Charts';
import { DataTable, useClientTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States';
import { Card, CardHeader, KpiCard, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import type { Row } from '../types';
import { CHART_COLORS, downloadCsv, fmtNumber } from '../utils/format';

const qualityCols: Column<Row>[] = [
  { key: 'Table', header: 'Table', render: (r) => <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{String(r.Table)}</span> },
  { key: 'Column', header: 'Column', render: (r) => <span className="font-medium text-slate-800">{String(r.Column)}</span> },
  { key: 'Data Type', header: 'Type' },
  { key: 'Missing Count', header: 'Missing', align: 'right' },
  {
    key: 'Missing Percentage',
    header: 'Missing %',
    align: 'right',
    render: (r) => {
      const v = Number(r['Missing Percentage']);
      return (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full ${v > 50 ? 'bg-rose-500' : v > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, v)}%` }} />
          </div>
          <span className="w-12 tabular-nums">{v.toFixed(1)}%</span>
        </div>
      );
    },
  },
  { key: 'Unique Values', header: 'Unique', align: 'right' },
];

const ambiguousCols: Column<Row>[] = [
  { key: 'Source_Row', header: 'Sheet Row', align: 'right' },
  { key: 'Student_ID', header: 'Student', render: (r) => <Link to={`/student-360/${r.Student_ID}`} className="link">{`${r.Name} (${r.Student_ID})`}</Link> },
  { key: 'Company', header: 'Company' },
  { key: 'Role', header: 'Role' },
  { key: 'Reason', header: 'Reason flagged', sortable: false, className: '!whitespace-normal min-w-[320px] text-slate-600' },
];

export default function DataQuality() {
  const { data, error, reload } = useApi(() => api.dataQuality(), []);
  const q = useClientTable<Row>(data?.quality_table ?? [], undefined, 25);
  const amb = useClientTable<Row>(data?.ambiguous ?? [], 'Student_ID', 10);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  const s = data.summary;
  const r = s.reconciliation;
  const recon: [string, number | boolean][] = [
    ['Raw records', r.raw_records],
    ['True duplicates removed', r.true_duplicates_removed],
    ['Clean records', r.clean_records],
    ['Unique students', r.unique_students],
    ['Students with 1 internship', r.students_with_1_internship],
    ['Students with 2 internships', r.students_with_2_internships],
    ['Students with 3 internships', r.students_with_3_internships],
    ['Students with 4+ internships', r.students_with_4plus_internships],
  ];

  return (
    <>
      <PageHeader title="Data Quality" subtitle={`Pipeline audit of the source sheet · generated ${new Date(s.generated_at).toLocaleString()}`} />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Raw Records" value={fmtNumber(s.raw_records)} icon={Database} />
          <KpiCard label="Clean Records" value={fmtNumber(s.clean_records)} icon={Layers} tone="green" />
          <KpiCard label="Unique Students" value={fmtNumber(s.unique_students)} icon={Users} tone="teal" />
          <KpiCard label="Exact Duplicates Removed" value={fmtNumber(s.exact_duplicates_removed)} icon={Copy} tone="slate" />
          <KpiCard label="Ambiguous Records" value={fmtNumber(s.ambiguous_records)} icon={AlertTriangle} tone="amber" hint="Kept, flagged for review" />
          <KpiCard label="Multiple Internships" value={fmtNumber(s.students_with_multiple_internships)} icon={Repeat} tone="violet" hint="Students, all records preserved" />
          <KpiCard label="Missing Stipend" value={fmtNumber(s.missing_stipend)} icon={WalletCards} tone="rose" hint={`${s.non_inr_stipend_records} non-INR record(s)`} />
          <KpiCard
            label="Invalid Dates"
            value={fmtNumber(s.invalid_joining_dates + s.invalid_end_dates + s.invalid_extension_dates)}
            icon={CalendarX}
            tone="rose"
            hint={`joining ${s.invalid_joining_dates} · end ${s.invalid_end_dates} · extension ${s.invalid_extension_dates}`}
          />
          <KpiCard label="#REF! in Month" value={fmtNumber(s.month_ref_errors)} icon={FileWarning} tone="amber" hint="Month re-derived from joining date" />
          <KpiCard label="Missing Status" value={fmtNumber(s.missing_status)} icon={AlertTriangle} tone="slate" hint="Shown as 'Not recorded'" />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Reconciliation" subtitle={r.records_balance_ok ? 'Raw − duplicates = clean ✓' : 'Record counts do not balance'} />
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {recon.map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-5 py-2 text-slate-600">{k}</td>
                    <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
              <p>
                <b>Empty source columns (ignored):</b> {s.empty_source_columns_dropped.join(', ') || 'none'}
              </p>
              <p>
                <b>Students missing:</b> location {s.students_missing_location}, contact {s.students_missing_contact}
              </p>
            </div>
          </Card>
          <ChartCard title="Missing Values in Source Columns" subtitle="Count of blank cells per column" className="lg:col-span-3" height={Math.max(420, data.missing_by_column.length * 24)} empty={!data.missing_by_column.length}>
            <HBarChart data={data.missing_by_column.map((m) => ({ name: m.name, value: m.value }))} color={CHART_COLORS[4]} label="Missing" labelWidth={230} />
          </ChartCard>
        </div>

        <Card>
          <CardHeader title="Company Name Standardisation" subtitle="Spelling / casing variants merged by an explicit alias list (original names kept in Company_Raw)" />
          <ul className="divide-y divide-slate-100 text-sm">
            {Object.entries(s.company_names_merged).map(([name, variants]) => (
              <li key={name} className="flex flex-wrap gap-x-3 px-5 py-2">
                <span className="w-48 font-medium text-slate-800">{name}</span>
                <span className="text-slate-500">← {variants}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Duplicate Records"
            subtitle="Rows identical in every original column — the only rows removed"
            actions={
              data.duplicates.length > 0 && (
                <button className="btn-secondary" onClick={() => downloadCsv('duplicate_records.csv', data.duplicates)}>
                  Export
                </button>
              )
            }
          />
          {data.duplicates.length ? (
            <pre className="overflow-auto p-4 text-xs">{JSON.stringify(data.duplicates, null, 2)}</pre>
          ) : (
            <EmptyState title="No exact duplicates found" message="Students who appear more than once have different companies/dates and are kept as separate internship records." />
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Ambiguous Records (${data.ambiguous.length})`}
            subtitle="Kept in the data and flagged for human review — never silently deleted"
            actions={
              <div className="flex gap-2">
                <SearchInput value={amb.search} onChange={amb.setSearch} placeholder="Search…" className="w-48" />
                <button className="btn-secondary" onClick={() => downloadCsv('ambiguous_records.csv', amb.filtered)}>
                  Export
                </button>
              </div>
            }
          />
          <DataTable columns={ambiguousCols} rowKey={(r) => `${r.Source_Row}`} {...amb.tableProps} />
        </Card>

        <Card>
          <CardHeader
            title="Column Quality Report"
            subtitle="Raw source, cleaned internship table and student master"
            actions={
              <div className="flex gap-2">
                <SearchInput value={q.search} onChange={q.setSearch} placeholder="Search columns…" className="w-48" />
                <button className="btn-secondary" onClick={() => downloadCsv('data_quality_report.csv', q.filtered)}>
                  Export
                </button>
              </div>
            }
          />
          <DataTable columns={qualityCols} rowKey={(r) => `${r.Table}-${r.Column}`} {...q.tableProps} />
        </Card>
      </div>
    </>
  );
}
