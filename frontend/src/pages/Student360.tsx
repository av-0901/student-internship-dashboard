import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ExternalLink,
  IndianRupee,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  UserRound,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchInput } from '../components/SearchInput';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { Card, CardHeader, KpiCard, PageHeader, StatusBadge } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import type { Internship } from '../types';
import { display, fmtDate, fmtINR, initials } from '../utils/format';

function StudentPicker({ selected }: { selected?: string }) {
  const { options } = useFilters();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = options?.students ?? [];
    return term ? list.filter((s) => s.Name.toLowerCase().includes(term) || s.Student_ID.toLowerCase().includes(term)) : list;
  }, [q, options]);

  return (
    <Card className="flex max-h-[calc(100vh-180px)] flex-col lg:sticky lg:top-24">
      <div className="border-b border-slate-100 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search student name or ID…" />
        <p className="mt-2 px-1 text-xs text-slate-500">{matches.length} student(s)</p>
      </div>
      <ul className="flex-1 overflow-y-auto p-1.5" role="listbox" aria-label="Students">
        {!options && <Loading label="Loading students…" />}
        {matches.map((s) => (
          <li key={s.Student_ID}>
            <button
              role="option"
              aria-selected={s.Student_ID === selected}
              onClick={() => navigate(`/student-360/${s.Student_ID}`)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                s.Student_ID === selected ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{initials(s.Name)}</span>
              <span className="min-w-0 flex-1 truncate">{s.Name}</span>
              <span className="font-mono text-[10px] text-slate-400">{s.Student_ID}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <div className="break-words text-sm text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {done ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

function InternshipCard({ r, index }: { r: Internship; index: number }) {
  const stipend =
    r.Stipend !== null ? `${fmtINR(r.Stipend)} / month` : r.Stipend_Currency && r.Stipend_Currency !== 'INR' ? `${r.Stipend_Raw} / month (non-INR)` : 'Not recorded';
  const details: [string, React.ReactNode][] = [
    ['Joining Location', display(r.Joining_Location)],
    ['Joining Date', fmtDate(r.Joining_Date)],
    ['Stipend', stipend],
    ['Tenure', r.Tenure_Months !== null ? `${r.Tenure_Months} months` : '—'],
    ['Total Stipend', fmtINR(r.Total_Stipend)],
    ['Tenure End', r.Tenure_End_Date ? fmtDate(r.Tenure_End_Date) : display(r.Tenure_End_Date_Raw)],
    ['Country', display(r.Internship_Country)],
    ['Academic Year', display(r.Academic_Year)],
    ['Extension', r.Is_Extended ? display(r.Extension_Raw ?? 'Yes') : 'No'],
    ['Offer Letter', r.Offer_Letter_Available ? display(r.Offer_Letter_File) : 'Not on file'],
    ['Stipend Increase', display(r.Stipend_Increase)],
    ['Process Status', <StatusBadge key="p" status={r.Process_Status} />],
  ];
  return (
    <div className="relative pl-8">
      <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-[11px] font-semibold text-white ring-2 ring-brand-100">
        {index + 1}
      </span>
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-slate-900">{display(r.Company)}</p>
            <p className="text-sm text-slate-600">{display(r.Role)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">{r.Internship_ID}</span>
            <StatusBadge status={r.Status} />
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3 xl:grid-cols-4">
          {details.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="truncate text-slate-700" title={typeof v === 'string' ? v : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          <Step done={r.Screen_Display} label="3 Screen Displays" />
          <Step done={r.Digital_Photo_Given} label="Digital Photo" />
          <Step done={r.Founder_Letter} label="Founder's Letter" />
          <Step done={r.Parent_Call} label={r.Parent_Call_By ? `Parent Call (${r.Parent_Call_By})` : 'Parent Call'} />
        </div>
        {(r.Feedback || r.Notes) && (
          <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {r.Feedback && (
              <p>
                <b className="text-slate-700">Feedback:</b> {r.Feedback}
              </p>
            )}
            {r.Notes && (
              <p>
                <b className="text-slate-700">Sheet note:</b> {r.Notes}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function StudentView({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi(() => api.student(id), [id]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <Loading label="Loading student…" />;
  const { profile: p, kpis, internships } = data;
  const safeLinkedIn = p.LinkedIn && /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(p.LinkedIn) ? p.LinkedIn : null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-brand-600 to-brand-500" />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex flex-wrap items-end gap-4">
            {p.Student_Picture ? (
              <img src={p.Student_Picture} alt={p.Name} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-50 text-2xl font-semibold text-brand-700 shadow" title="No student picture in the dataset">
                {initials(p.Name)}
              </span>
            )}
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="text-xl font-semibold text-slate-900">{p.Name}</h2>
              <p className="text-sm text-slate-500">
                <span className="font-mono">{p.Student_ID}</span> · Batch {display(p.Batch)} · {display(p.Gender)}
              </p>
            </div>
            {safeLinkedIn && (
              <a href={safeLinkedIn} target="_blank" rel="noopener noreferrer" className="btn-secondary mb-1">
                <Linkedin className="h-4 w-4 text-[#0a66c2]" /> LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Field icon={Mail} label="Email">
              {display(p.Email)}
            </Field>
            <Field icon={Phone} label="Contact">
              {display(p.Contact)}
              {p.Alternate_Contacts && <span className="block text-xs text-slate-500">Also recorded: {p.Alternate_Contacts}</span>}
            </Field>
            <Field icon={MapPin} label="Home location">
              {[p.City, p.State, p.Country].filter(Boolean).join(', ') || 'Not recorded'}
            </Field>
            <Field icon={UserRound} label="LinkedIn">
              {safeLinkedIn ? <span className="text-slate-600">On file</span> : 'Not recorded'}
            </Field>
          </div>
          {data.data_flags.length > 0 && (
            <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <b>Data review flags:</b>
                <ul className="list-disc pl-4">
                  {[...new Set(data.data_flags.flatMap((f) => f.Reason.split(' | ')))].map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {p.Name_Variants && <p className="mt-1">Name spellings recorded: {p.Name_Variants}</p>}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-5">
        <KpiCard label="Internships" value={kpis.internship_count} icon={Briefcase} />
        <KpiCard label="Companies" value={kpis.company_count} icon={Building2} tone="amber" />
        <KpiCard label="Avg Stipend" value={fmtINR(kpis.average_stipend)} icon={IndianRupee} tone="green" hint={`${kpis.known_stipend_records} known INR record(s)`} />
        <KpiCard label="Latest Internship" value={<span className="block text-sm font-semibold leading-snug">{display(kpis.latest_internship)}</span>} icon={CalendarDays} tone="violet" />
        <KpiCard label="Latest Status" value={<span className="text-base"><StatusBadge status={kpis.latest_status} /></span>} icon={Check} tone="teal" />
      </div>

      <div>
        <CardHeader title={`Internship & Professional Records (${internships.length})`} subtitle="Every record is shown separately, in joining order" />
        <div className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-slate-200">
          {internships.map((r, i) => (
            <InternshipCard key={r.Internship_ID} r={r} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Student360() {
  const { studentId } = useParams();
  const valid = studentId && /^STU\d{4}$/.test(studentId) ? studentId : undefined;
  return (
    <>
      <PageHeader title="Student 360" subtitle="Complete profile and every internship record for a single student" />
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <StudentPicker selected={valid} />
        <div>
          {valid ? (
            <StudentView id={valid} />
          ) : (
            <Card>
              <EmptyState
                title={studentId ? 'Invalid student ID' : 'Select a student'}
                message="Search and select a student from the list to see their full profile, KPIs and internship timeline."
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
