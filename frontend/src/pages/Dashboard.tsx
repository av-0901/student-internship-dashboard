import { Briefcase, Building2, IndianRupee, Layers, Lightbulb, Repeat, UserCheck, UserX, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChartCard, DonutChart, HBarChart, TimelineChart } from '../charts/Charts';
import { ErrorState, PageSkeleton } from '../components/States';
import { Card, CardHeader, KpiCard, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import { CHART_COLORS, fmtINR, fmtNumber, pct } from '../utils/format';

export default function Dashboard() {
  const { filters, setFilter } = useFilters();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.summary(filters), [JSON.stringify(filters)]);

  return (
    <>
      <PageHeader title="2024 Student & Internship Analytics" subtitle="Comprehensive student and internship insights for the 2024 batch" />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <PageSkeleton />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Total Students" value={fmtNumber(data.kpis.total_students)} icon={Users} hint="Unique student profiles" onClick={() => navigate('/students')} />
            <KpiCard label="Internship Records" value={fmtNumber(data.kpis.total_internship_records)} icon={Briefcase} tone="teal" hint="All professional records" onClick={() => navigate('/internships')} />
            <KpiCard
              label="With Internship"
              value={fmtNumber(data.kpis.students_with_internship)}
              icon={UserCheck}
              tone="green"
              hint={`${pct(data.kpis.students_with_internship, data.kpis.total_students)} of students · excl. rejected offers`}
            />
            <KpiCard label="Without Internship" value={fmtNumber(data.kpis.students_without_internship)} icon={UserX} tone="rose" hint="Only rejected offers on record" />
            <KpiCard
              label="Multiple Internships"
              value={fmtNumber(data.kpis.students_with_multiple_internships)}
              icon={Repeat}
              tone="violet"
              hint={`${pct(data.kpis.students_with_multiple_internships, data.kpis.total_students)} of students`}
            />
            <KpiCard label="Companies" value={fmtNumber(data.kpis.companies)} icon={Building2} tone="amber" onClick={() => navigate('/companies')} />
            <KpiCard label="Roles" value={fmtNumber(data.kpis.roles)} icon={Layers} tone="slate" hint="Distinct role titles" />
            <KpiCard label="Average Stipend" value={fmtINR(data.kpis.average_stipend)} icon={IndianRupee} tone="green" hint={`Monthly · ${data.kpis.known_stipend_records} known records`} onClick={() => navigate('/stipend')} />
            <KpiCard label="Median Stipend" value={fmtINR(data.kpis.median_stipend)} icon={Wallet} tone="teal" hint="Monthly, known INR only" onClick={() => navigate('/stipend')} />
            <Card className="flex flex-col justify-center p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Records per student</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {data.kpis.total_students ? (data.kpis.total_internship_records / data.kpis.total_students).toFixed(2) : '—'}
              </p>
              <p className="text-xs text-slate-500">Average internship records</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Gender Distribution" subtitle="Click a segment to filter" empty={!data.charts.gender.length}>
              <DonutChart data={data.charts.gender} centerLabel="Students" onClick={(g) => setFilter('gender', g)} />
            </ChartCard>
            <ChartCard title="Internship Status" subtitle="Across all internship records" empty={!data.charts.status.length}>
              <DonutChart data={data.charts.status} centerLabel="Records" onClick={(s) => setFilter('status', s)} />
            </ChartCard>
            <Card className="flex flex-col">
              <CardHeader title="Quick Insights" subtitle="Generated from the current selection" />
              <ul className="flex-1 space-y-2.5 px-5 py-4">
                {data.insights.length ? (
                  data.insights.map((t) => (
                    <li key={t} className="flex gap-2.5 text-sm text-slate-600">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span>{t}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">No insights for the current filters.</li>
                )}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Top Companies" subtitle="By internship records · click to filter" height={320} empty={!data.charts.top_companies.length}>
              <HBarChart data={data.charts.top_companies} onClick={(c) => setFilter('company', c)} labelWidth={170} />
            </ChartCard>
            <ChartCard title="Top Roles" subtitle="By internship records · click to filter" height={320} empty={!data.charts.top_roles.length}>
              <HBarChart data={data.charts.top_roles} color={CHART_COLORS[1]} onClick={(r) => setFilter('role', r)} labelWidth={200} />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <ChartCard title="Internships by Joining Month" subtitle="Records by joining date" className="lg:col-span-3" height={300} empty={!data.charts.joining_months.length}>
              <TimelineChart data={data.charts.joining_months} />
            </ChartCard>
            <ChartCard title="Students by Home State" subtitle="Click a state to filter" className="lg:col-span-2" height={300} empty={!data.charts.states.length}>
              <HBarChart data={data.charts.states} color={CHART_COLORS[3]} label="Students" onClick={(s) => s !== 'Not recorded' && setFilter('state', s)} labelWidth={120} />
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}
