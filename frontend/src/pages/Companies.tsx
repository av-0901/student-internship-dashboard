import { Building2, Download, Layers, Repeat, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ChartCard, HBarChart } from '../charts/Charts';
import { DataTable, useServerTable, type Column } from '../components/DataTable';
import { SearchInput } from '../components/SearchInput';
import { EmptyState, ErrorState, PageSkeleton } from '../components/States';
import { Card, CardHeader, KpiCard, PageHeader } from '../components/ui';
import { useApi, useDebounced } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import type { Row } from '../types';
import { CHART_COLORS, downloadCsv, fmtINR, fmtNumber } from '../utils/format';

const companyCols: Column<Row>[] = [
  { key: 'Company', header: 'Company', render: (r) => <span className="font-medium text-slate-900">{String(r.Company)}</span> },
  { key: 'Student_Count', header: 'Students', align: 'right' },
  { key: 'Internship_Record_Count', header: 'Records', align: 'right' },
  { key: 'Average_Stipend', header: 'Avg Stipend', align: 'right', render: (r) => fmtINR(r.Average_Stipend as number | null) },
  { key: 'Countries', header: 'Country' },
  { key: 'Top_Roles', header: 'Top Roles', sortable: false, className: '!whitespace-normal min-w-[260px] text-slate-600' },
];

const roleCols: Column<Row>[] = [
  { key: 'Role', header: 'Role', render: (r) => <span className="font-medium text-slate-900">{String(r.Role)}</span> },
  { key: 'Student_Count', header: 'Students', align: 'right' },
  { key: 'Internship_Record_Count', header: 'Records', align: 'right' },
  { key: 'Average_Stipend', header: 'Avg Stipend', align: 'right', render: (r) => fmtINR(r.Average_Stipend as number | null) },
  { key: 'Companies', header: 'Companies', sortable: false, className: '!whitespace-normal min-w-[240px] text-slate-600' },
];

export default function Companies() {
  const { filters, setFilter } = useFilters();
  const fkey = JSON.stringify(filters);
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const t = useServerTable('Internship_Record_Count', 'desc', 10);
  const [roleSearch, setRoleSearch] = useState('');
  const rq = useDebounced(roleSearch);
  const rt = useServerTable('Internship_Record_Count', 'desc', 10);

  useEffect(() => t.setPage(1), [q, fkey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => rt.setPage(1), [rq, fkey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload } = useApi(() => api.companies(filters, { ...t.query, search: q }), [fkey, JSON.stringify(t.query), q]);
  const roles = useApi(() => api.roles(filters, { ...rt.query, search: rq }), [fkey, JSON.stringify(rt.query), rq]);

  const relationship = useMemo(() => {
    const map = new Map<string, { role: string; value: number }[]>();
    data?.charts.company_role.forEach((r) => map.set(r.company, [...(map.get(r.company) ?? []), { role: r.role, value: r.value }]));
    const order = data?.charts.by_records.map((c) => c.name) ?? [];
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [data]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Companies & Roles" subtitle="Employers, roles and how they relate. Click a company to filter the whole dashboard." />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Companies" value={fmtNumber(data.kpis.companies)} icon={Building2} tone="amber" />
          <KpiCard label="Roles" value={fmtNumber(data.kpis.roles)} icon={Layers} tone="teal" />
          <KpiCard label="Repeat Employers" value={fmtNumber(data.kpis.repeat_employers)} icon={Repeat} tone="violet" hint="Companies with 2+ records" />
          <KpiCard label="Single-hire Companies" value={fmtNumber(data.kpis.single_hire_companies)} icon={UserPlus} tone="slate" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Top Companies by Students" subtitle="Distinct students · click to filter" height={340} empty={!data.charts.by_students.length}>
            <HBarChart data={data.charts.by_students} label="Students" onClick={(c) => setFilter('company', c)} labelWidth={180} />
          </ChartCard>
          <ChartCard title="Top Companies by Internship Records" subtitle="All records · click to filter" height={340} empty={!data.charts.by_records.length}>
            <HBarChart data={data.charts.by_records} color={CHART_COLORS[2]} onClick={(c) => setFilter('company', c)} labelWidth={180} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Top Roles" subtitle="Click to filter" height={360} empty={!data.charts.top_roles.length}>
            <HBarChart data={data.charts.top_roles} color={CHART_COLORS[1]} onClick={(r) => setFilter('role', r)} labelWidth={210} />
          </ChartCard>
          <Card>
            <CardHeader title="Company–Role Relationship" subtitle="Roles hired by the top 10 companies" />
            <div className="max-h-[360px] divide-y divide-slate-100 overflow-auto px-5">
              {relationship.length ? (
                relationship.map(([company, rs]) => (
                  <div key={company} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start">
                    <button onClick={() => setFilter('company', company)} className="w-44 shrink-0 truncate text-left text-sm font-medium text-slate-800 hover:text-brand-700" title={company}>
                      {company}
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {rs.map((r) => (
                        <button
                          key={r.role}
                          onClick={() => setFilter('role', r.role)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:border-brand-200 hover:bg-brand-50"
                        >
                          {r.role}
                          <span className="rounded bg-white px-1 font-semibold text-brand-700">{r.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Company Directory"
            subtitle="Click a row to filter the dashboard by that company"
            actions={
              <div className="flex gap-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Search companies or roles…" className="w-56 sm:w-64" />
                <button className="btn-secondary" onClick={() => downloadCsv('companies_page.csv', data.table.items)} title="Export current page">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            }
          />
          <DataTable
            columns={companyCols}
            rows={data.table.items}
            rowKey={(r) => String(r.Company)}
            sort={t.sort}
            onSort={t.onSort}
            onRowClick={(r) => setFilter('company', String(r.Company))}
            loading={loading}
            page={data.table.page}
            pages={data.table.pages}
            total={data.table.total}
            pageSize={t.pageSize}
            onPage={t.setPage}
            onPageSize={t.onPageSize}
          />
        </Card>

        <Card>
          <CardHeader
            title="Role Directory"
            subtitle="Role titles as recorded (case/spacing variants merged)"
            actions={<SearchInput value={roleSearch} onChange={setRoleSearch} placeholder="Search roles or companies…" className="w-56 sm:w-64" />}
          />
          {roles.error ? (
            <div className="p-4">
              <ErrorState message={roles.error} onRetry={roles.reload} />
            </div>
          ) : (
            <DataTable
              columns={roleCols}
              rows={roles.data?.items ?? []}
              rowKey={(r) => String(r.Role)}
              sort={rt.sort}
              onSort={rt.onSort}
              onRowClick={(r) => setFilter('role', String(r.Role))}
              loading={roles.loading}
              page={roles.data?.page ?? 1}
              pages={roles.data?.pages ?? 1}
              total={roles.data?.total ?? 0}
              pageSize={rt.pageSize}
              onPage={rt.setPage}
              onPageSize={rt.onPageSize}
            />
          )}
        </Card>
      </div>
    </>
  );
}
