import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function Loading({ label = 'Loading data…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-16 text-sm text-slate-500 ${className}`} role="status">
      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      {label}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-rose-500" />
      <div>
        <p className="font-semibold text-rose-800">Unable to load data</p>
        <p className="mt-1 text-sm text-rose-700">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-1">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No data',
  message = 'Nothing matches the current filters.',
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}
