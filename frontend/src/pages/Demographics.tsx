import { Globe2, MapPin, MapPinOff, Users } from 'lucide-react';
import { ChartCard, DonutChart, HBarChart, StackedBarChart } from '../charts/Charts';
import { ErrorState, PageSkeleton } from '../components/States';
import { KpiCard, Notes, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import { CHART_COLORS, fmtNumber, pct } from '../utils/format';

export default function Demographics() {
  const { filters, setFilter } = useFilters();
  const { data, loading, error, reload } = useApi(() => api.demographics(filters), [JSON.stringify(filters)]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSkeleton />;
  const genders = Array.from(new Set(data.charts.gender_by_state.flatMap((r) => Object.keys(r).filter((k) => k !== 'State'))));

  return (
    <>
      <PageHeader title="Demographics" subtitle="Gender and home location of students (one count per student)" />
      <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Students" value={fmtNumber(data.kpis.students)} icon={Users} />
          <KpiCard label="Home States" value={fmtNumber(data.kpis.states)} icon={Globe2} tone="violet" />
          <KpiCard label="Home Cities" value={fmtNumber(data.kpis.cities)} icon={MapPin} tone="teal" />
          <KpiCard
            label="Location Not Recorded"
            value={fmtNumber(data.kpis.location_missing)}
            icon={MapPinOff}
            tone="amber"
            hint={`${pct(data.kpis.location_missing, data.kpis.students)} of students`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Gender Distribution" subtitle="Click to filter" empty={!data.charts.gender.length}>
            <DonutChart data={data.charts.gender} centerLabel="Students" onClick={(g) => setFilter('gender', g)} />
          </ChartCard>
          <ChartCard title="Home Country" subtitle="Derived from recorded home state" empty={!data.charts.home_country.length}>
            <DonutChart data={data.charts.home_country} centerLabel="Students" />
          </ChartCard>
          <ChartCard title="Internship Country" subtitle="Where internships are based (records)" empty={!data.charts.internship_country.length}>
            <DonutChart data={data.charts.internship_country} centerLabel="Records" />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Students by State" subtitle="Click a state to filter" height={Math.max(300, data.charts.states.length * 24)} empty={!data.charts.states.length}>
            <HBarChart data={data.charts.states} color={CHART_COLORS[3]} label="Students" labelWidth={140} onClick={(s) => s !== 'Not recorded' && setFilter('state', s)} />
          </ChartCard>
          <ChartCard title="Students by City" subtitle="Top 15 home cities · click to filter" height={Math.max(300, data.charts.states.length * 24)} empty={!data.charts.cities.length}>
            <HBarChart data={data.charts.cities} color={CHART_COLORS[1]} label="Students" labelWidth={140} onClick={(c) => c !== 'Not recorded' && setFilter('city', c)} />
          </ChartCard>
        </div>

        <ChartCard title="Gender by State" subtitle="Top 10 states with recorded location" height={340} empty={!data.charts.gender_by_state.length}>
          <StackedBarChart data={data.charts.gender_by_state} keys={genders} categoryKey="State" layout="vertical" />
        </ChartCard>

        <Notes items={data.notes} />
      </div>
    </>
  );
}
