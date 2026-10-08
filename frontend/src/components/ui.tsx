import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_COLORS } from '../utils/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

const tones = {
  brand: 'bg-brand-50 text-brand-600',
  teal: 'bg-teal-50 text-teal-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-50 text-emerald-600',
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`card flex w-full items-start gap-3 p-4 text-left ${onClick ? 'transition hover:border-brand-200 hover:shadow-md' : ''}`}
    >
      {Icon && (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase leading-tight tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs leading-snug text-slate-500">{hint}</p>}
      </div>
    </Comp>
  );
}

const badgeClass: Record<string, string> = {
  'Offer Accepted': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'Tenure Completed': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'Early Relieving': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'Offer Rejected': 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'In Progress': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'Not Started': 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? 'Not recorded';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        badgeClass[s] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[s] ?? '#94a3b8' }} />
      {s}
    </span>
  );
}

export function YesNo({ value, yes = 'Yes', no = 'No' }: { value: boolean | null | undefined; yes?: string; no?: string }) {
  return value ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{yes}</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{no}</span>
  );
}

export function Notes({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600">
      <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">How these numbers are calculated</p>
      <ul className="list-disc space-y-0.5 pl-4">
        {items.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
