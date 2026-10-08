import { CalendarClock, CheckCircle2, ClipboardCheck, FileText, PhoneCall, TimerReset } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChartCard, DonutChart, HBarChart, StackedBarChart, TimelineChart } from '../charts/Charts';
import { DataTable, useClientTable, type Column } from '../components/DataTable';
import { ErrorState, PageSkeleton } from '../components/States';
import { Card, CardHeader, KpiCard, Notes, PageHeader, StatusBadge } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import type { Row } from '../types';
import { CHART_COLORS, fmtDate, fmtNumber, pct } from '../utils/format';

const studentLink = (r: Row) => (
  <Link to={`/student-360/${r.Student_ID}`} className="link">
    {String(r.Name)}
  </Link>
);

const extendedCols: Column<Row>[] = [
  { key: 'Name', header: 'Student', render: studentLink },
  { key: 'Company', header: 'Company' },
  { key: 'Status', header: 'Status', render: (r) => <StatusBadge status={r.Status as string} /> },
  { key: 'Extension_Raw', header: 'Extended Until (as recorded)' },
  { key: 'Extension_Letter_File', header: 'Extension Letter' },
  { key: 'Stipend_Increase', header: 'Stipend Increase' },
];

const endingCols: Column<Row>[] = [
  { key: 'Name', header: 'Student', render: studentLink },
  { key: 'Company', header: 'Company' },
  { key: 'Role', header: 'Role' },
  { key: 'Tenure_End_Date', header: 'Tenure Ends', render: (r) => fmtDate(r.Tenure_End_Date as string) },
  { key: 'Status', header: 'Status', render: (r) => <StatusBadge status={r.Status as string} /> },
];

export default function Operations() {
  const { filters, setFilter } = useFilters();
  const { data, loading, error, reload } = useApi(() => api.operations(filters), [JSON.stringify(filters)]);
  const ext = useClientTable<Row>(data?.extended_records ?? [], 'Name', 5);
  const ending = useClientTable<Row>(data?.ending_soon ?? [], 'Tenure_End_Date', 5);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  const { kpis, charts } = data;

  return (
    <>
      <PageHeader title="Operations" subtitle="Internship lifecycle and onboarding process tracking, using only fields present in the sheet" />
      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Records" value={fmtNumber(kpis.records)} icon={ClipboardCheck} />
          <KpiCard label="Offer Accepted" value={fmtNumber(kpis.offer_accepted)} icon={CheckCircle2} tone="green" hint={pct(kpis.offer_accepted, kpis.records)} />
          <KpiCard label="Extended" value={fmtNumber(kpis.extended)} icon={TimerReset} tone="violet" hint={pct(kpis.extended, kpis.records)} />
          <KpiCard label="Offer Letters" value={fmtNumber(kpis.offer_letters)} icon={FileText} tone="teal" hint="On file" />
          <KpiCard label="Parent Calls" value={fmtNumber(kpis.parent_calls)} icon={PhoneCall} tone="amber" hint={pct(kpis.parent_calls, kpis.records)} />
          <KpiCard label="Process Completed" value={fmtNumber(kpis.process_completed)} icon={CalendarClock} tone="slate" hint="All 4 tracked steps" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Status Distribution" subtitle="Click to filter" empty={!charts.status.length}>
            <DonutChart data={charts.status} centerLabel="Records" onClick={(s) => setFilter('status', s)} />
          </ChartCard>
          <ChartCard title="Joining Timeline" className="lg:col-span-2" empty={!charts.joining_timeline.length}>
            <TimelineChart data={charts.joining_timeline} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Extension Analysis" subtitle="Records with an extension date or letter" empty={!kpis.records}>
            <DonutChart data={charts.extension} centerLabel="Records" />
          </ChartCard>
          <ChartCard title="Offer Letter" subtitle="Offer letter file recorded" empty={!kpis.records}>
            <DonutChart data={charts.offer_letter} centerLabel="Records" />
          </ChartCard>
          <ChartCard title="Onboarding Process Status" subtitle="Steps completed out of 4 tracked" empty={!charts.process_status.length}>
            <DonutChart data={charts.process_status} centerLabel="Records" />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Onboarding Steps" subtitle="Done vs pending per step" empty={!kpis.records}>
            <StackedBarChart data={charts.process_steps} keys={['done', 'pending']} colors={['#16a34a', '#e2e8f0']} layout="vertical" />
          </ChartCard>
          <ChartCard title="Joining Location" subtitle="Click to filter" empty={!charts.joining_locations.length}>
            <HBarChart data={charts.joining_locations} color={CHART_COLORS[5]} labelWidth={140} onClick={(l) => setFilter('joining_location', l)} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Extensions by Status" height={220} empty={!charts.extension_by_status.length}>
            <HBarChart data={charts.extension_by_status} colorByName labelWidth={130} />
          </ChartCard>
          <ChartCard title="Academic Year at Joining" subtitle="From the sheet's Year column" height={220} empty={!charts.academic_year.length}>
            <HBarChart data={charts.academic_year} color={CHART_COLORS[3]} labelWidth={110} />
          </ChartCard>
        </div>

        <Card>
          <CardHeader title="Extended Internships" subtitle={`${data.extended_records.length} record(s)`} />
          <DataTable columns={extendedCols} rowKey={(r) => String(r.Internship_ID)} {...ext.tableProps} emptyMessage="No extended internships for the current filters." />
        </Card>

        <Card>
          <CardHeader title="Tenures Ending in the Next 60 Days" subtitle="Based on the sheet's Deadline (tenure end) column" />
          <DataTable columns={endingCols} rowKey={(r) => String(r.Internship_ID)} {...ending.tableProps} emptyMessage="No tenures end in the next 60 days." />
        </Card>

        <Notes items={data.notes} />
      </div>
    </>
  );
}
