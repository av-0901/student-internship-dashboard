export const CHART_COLORS = ['#2554e0', '#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#0ea5e9', '#64748b', '#16a34a', '#db2777', '#a16207'];

export const STATUS_COLORS: Record<string, string> = {
  'Offer Accepted': '#16a34a',
  'Tenure Completed': '#2554e0',
  'Early Relieving': '#f59e0b',
  'Offer Rejected': '#e11d48',
  'Not recorded': '#94a3b8',
  Completed: '#16a34a',
  'In Progress': '#f59e0b',
  'Not Started': '#94a3b8',
  Male: '#2554e0',
  Female: '#db2777',
  'Known INR stipend': '#16a34a',
  'Non-INR (excluded)': '#f59e0b',
  Missing: '#94a3b8',
};

export const colorFor = (name: string, i: number) => STATUS_COLORS[name] ?? CHART_COLORS[i % CHART_COLORS.length];

const nf = new Intl.NumberFormat('en-IN');

export function fmtNumber(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return digits ? v.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : nf.format(Math.round(v));
}

export function fmtINR(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `₹${nf.format(Math.round(v))}`;
}

export function fmtCompactINR(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `₹${v}`;
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function pct(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : '—';
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

/** Client-side CSV download for small tables; guards against spreadsheet formula injection. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]): void {
  if (!rows.length) return;
  const cols = columns ?? Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
