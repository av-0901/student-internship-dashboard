import { ArrowDownToLine, ArrowUpToLine, Calculator, CircleSlash, IndianRupee, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ChartCard, DonutChart, HBarChart, TimelineChart, VBarChart } from '../charts/Charts';
import { ErrorState, PageSkeleton } from '../components/States';
import { Card, CardHeader, KpiCard, Notes, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import type { StipendGroup } from '../types';
import { CHART_COLORS, fmtCompactINR, fmtINR } from '../utils/format';

export default function Stipend() {
  const { filters, setFilter } = useFilters();
  const { data, loading, error, reload } = useApi(() => api.stipend(filters), [JSON.stringify(filters)]);
  const [groupBy, setGroupBy] = useState<'by_company' | 'by_role' | 'by_location' | 'by_work_mode'>('by_company');

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  const { stats, charts } = data;
  const groups: StipendGroup[] = charts[groupBy];
  const filterKey = { by_company: 'company', by_role: 'role', by_location: 'joining_location', by_work_mode: null }[groupBy] as
    | 'company'
    | 'role'
    | 'joining_location'
    | null;

  return (
    <>
      <PageHeader title="Stipend Analytics" subtitle="Monthly stipends in INR. Missing stipends are never counted as zero." />
      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Average" value={fmtINR(stats.average)} icon={IndianRupee} hint="per month" />
          <KpiCard label="Median" value={fmtINR(stats.median)} icon={Wallet} tone="teal" hint="per month" />
          <KpiCard label="Minimum" value={fmtINR(stats.minimum)} icon={ArrowDownToLine} tone="slate" hint={stats.unpaid_count ? `${stats.unpaid_count} unpaid (₹0) record(s)` : 'per month'} />
          <KpiCard label="Maximum" value={fmtINR(stats.maximum)} icon={ArrowUpToLine} tone="violet" hint="per month" />
          <KpiCard label="Total Committed" value={fmtCompactINR(stats.total_committed)} icon={Calculator} tone="amber" hint="Sum of Total Stipend column" />
          <KpiCard
            label="Known vs Missing"
            value={`${stats.known_count} / ${stats.missing_count}`}
            icon={CircleSlash}
            tone="rose"
            hint={stats.non_inr_count ? `+${stats.non_inr_count} non-INR excluded` : 'known / missing'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Stipend Distribution" subtitle="Records by monthly stipend band (known INR only)" className="lg:col-span-2" empty={!stats.known_count}>
            <VBarChart data={charts.distribution} color={CHART_COLORS[0]} />
          </ChartCard>
          <Card>
            <CardHeader title="Data Coverage" subtitle="Known vs missing stipend" />
            <div className="h-[300px] px-3 pb-3 pt-4">
              <DonutChart data={charts.known_vs_missing} centerLabel="Records" />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Average Stipend by Group"
            subtitle="Top 12 groups by average monthly stipend · hover for record counts and range"
            actions={
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
                {(
                  [
                    ['by_company', 'Company'],
                    ['by_role', 'Role'],
                    ['by_location', 'Location'],
                    ['by_work_mode', 'Work mode'],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} onClick={() => setGroupBy(k)} className={`rounded-md px-2.5 py-1 font-medium ${groupBy === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="h-[380px] px-3 pb-3 pt-4">
            <HBarChart
              data={groups}
              format={(v) => fmtINR(v)}
              label="Avg stipend"
              labelWidth={200}
              color={CHART_COLORS[7]}
              onClick={filterKey ? (n) => setFilter(filterKey, n) : undefined}
            />
          </div>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide">Group</th>
                  <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide">Records</th>
                  <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide">Average</th>
                  <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide">Min</th>
                  <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g) => (
                  <tr key={g.name} className="hover:bg-slate-50">
                    <td className="px-4 py-1.5 font-medium text-slate-700">{g.name}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{g.records}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{fmtINR(g.value)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{fmtINR(g.min)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{fmtINR(g.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <ChartCard title="Average Stipend by Joining Month" empty={!charts.by_month.length}>
          <TimelineChart data={charts.by_month} color={CHART_COLORS[7]} label="Avg stipend" format={(v) => fmtCompactINR(v)} />
        </ChartCard>

        {data.non_inr_records.length > 0 && (
          <Card>
            <CardHeader title="Non-INR Stipends (excluded from INR statistics)" subtitle="Shown as recorded; no exchange rate is assumed" />
            <ul className="divide-y divide-slate-100 text-sm">
              {data.non_inr_records.map((r) => (
                <li key={String(r.Internship_ID)} className="flex flex-wrap gap-x-6 gap-y-1 px-5 py-2.5">
                  <span className="font-medium text-slate-800">{String(r.Name)}</span>
                  <span className="text-slate-600">{String(r.Company)}</span>
                  <span className="text-amber-700">Monthly: {String(r.Stipend_Raw)}</span>
                  <span className="text-slate-500">Total Stipend (as recorded): {fmtINR(r.Total_Stipend as number | null)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Notes items={data.notes} />
      </div>
    </>
  );
}
