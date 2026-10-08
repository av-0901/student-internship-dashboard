import { RotateCcw, X } from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import type { Filters } from '../types';

const LABELS: Record<keyof Filters, string> = {
  student: 'Student',
  gender: 'Gender',
  state: 'State',
  city: 'City',
  batch: 'Batch',
  company: 'Company',
  role: 'Role',
  status: 'Status',
  joining_location: 'Joining location',
  date_from: 'Joined from',
  date_to: 'Joined to',
  stipend_min: 'Min stipend',
  stipend_max: 'Max stipend',
};

function Select({ k, options, all = 'All' }: { k: keyof Filters; options: string[] | { value: string; label: string }[]; all?: string }) {
  const { filters, setFilter } = useFilters();
  return (
    <label className="filter-field">
      <span>{LABELS[k]}</span>
      <select value={filters[k] ?? ''} onChange={(e) => setFilter(k, e.target.value)} className="input">
        <option value="">{all}</option>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

export function FilterPanel({ onClose }: { onClose: () => void }) {
  const { filters, setFilter, reset, options, optionsError, activeCount } = useFilters();
  if (optionsError) return <div className="border-b border-slate-200 bg-white px-6 py-3 text-sm text-rose-600">Filter options could not be loaded.</div>;
  if (!options) return <div className="border-b border-slate-200 bg-white px-6 py-3 text-sm text-slate-500">Loading filters…</div>;

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Select k="student" options={options.students.map((s) => ({ value: s.Student_ID, label: `${s.Name} (${s.Student_ID})` }))} all="All students" />
        <Select k="gender" options={options.genders} />
        <Select k="state" options={options.states} />
        <Select k="city" options={options.cities} />
        <Select k="company" options={options.companies} />
        <Select k="role" options={options.roles} />
        <Select k="status" options={options.statuses} />
        <Select k="joining_location" options={options.joining_locations} />
        <label className="filter-field">
          <span>{LABELS.date_from}</span>
          <input type="date" className="input" min={options.date_min ?? undefined} max={options.date_max ?? undefined} value={filters.date_from ?? ''} onChange={(e) => setFilter('date_from', e.target.value)} />
        </label>
        <label className="filter-field">
          <span>{LABELS.date_to}</span>
          <input type="date" className="input" min={options.date_min ?? undefined} max={options.date_max ?? undefined} value={filters.date_to ?? ''} onChange={(e) => setFilter('date_to', e.target.value)} />
        </label>
        <label className="filter-field">
          <span>Stipend range (₹/month)</span>
          <div className="flex gap-1.5">
            <input type="number" min={0} step={1000} placeholder={`${options.stipend_min ?? 0}`} className="input w-1/2" value={filters.stipend_min ?? ''} onChange={(e) => setFilter('stipend_min', e.target.value)} aria-label="Minimum stipend" />
            <input type="number" min={0} step={1000} placeholder={`${options.stipend_max ?? ''}`} className="input w-1/2" value={filters.stipend_max ?? ''} onChange={(e) => setFilter('stipend_max', e.target.value)} aria-label="Maximum stipend" />
          </div>
        </label>
        <Select k="batch" options={options.batches} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Student filters narrow the cohort; internship filters keep only matching records (and the students who hold them). Stipend range excludes records without a known INR stipend.
        </p>
        <div className="flex shrink-0 gap-2 pl-3">
          <button className="btn-secondary" onClick={reset} disabled={!activeCount}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </button>
          <button className="btn-ghost" onClick={onClose} aria-label="Close filters">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActiveFilterChips() {
  const { filters, setFilter, reset, options } = useFilters();
  const entries = Object.entries(filters).filter(([, v]) => v) as [keyof Filters, string][];
  if (!entries.length) return null;
  const studentName = (id: string) => options?.students.find((s) => s.Student_ID === id)?.Name ?? id;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-brand-50/40 px-4 py-2 sm:px-6">
      <span className="mr-1 text-xs font-medium text-slate-500">Active filters:</span>
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white py-0.5 pl-2.5 pr-1 text-xs text-brand-700">
          <span className="text-slate-500">{LABELS[k]}:</span> {k === 'student' ? studentName(v) : v}
          <button onClick={() => setFilter(k, undefined)} className="rounded-full p-0.5 hover:bg-brand-50" aria-label={`Remove ${LABELS[k]} filter`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button onClick={reset} className="ml-1 text-xs font-medium text-brand-700 hover:underline">
        Clear all
      </button>
    </div>
  );
}
