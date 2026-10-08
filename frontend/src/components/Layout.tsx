import { Database, Filter, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useFilters } from '../hooks/useFilters';
import { api } from '../services/api';
import { ActiveFilterChips, FilterPanel } from './FilterPanel';
import { NAV, Sidebar } from './Sidebar';

// Pages whose data does not depend on the global filters.
const UNFILTERED = ['/data-quality', '/student-360'];

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sia-sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const { activeCount } = useFilters();
  const { pathname } = useLocation();
  const current = NAV.find((n) => pathname.startsWith(n.to));
  const filtersApply = !UNFILTERED.some((p) => pathname.startsWith(p));

  useEffect(() => {
    localStorage.setItem('sia-sidebar', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, []);

  useEffect(() => {
    document.title = `${current?.label ?? 'Analytics'} · Student & Internship Analytics 2024`;
    window.scrollTo(0, 0);
  }, [current]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:block">Student &amp; Internship Analytics · Batch 2024</p>
              <p className="truncate text-sm font-semibold text-slate-800">{current?.label ?? 'Analytics'}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span
                className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                  apiOk === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}
                title="All processing happens locally"
              >
                <Database className="h-3.5 w-3.5" />
                {apiOk === false ? 'API offline' : 'Local data'}
              </span>
              {filtersApply && (
                <button
                  onClick={() => setShowFilters((s) => !s)}
                  className={`btn-secondary ${showFilters ? 'border-brand-300 bg-brand-50 text-brand-700' : ''}`}
                  aria-expanded={showFilters}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{activeCount}</span>}
                </button>
              )}
            </div>
          </div>
          {filtersApply && showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
          {filtersApply && <ActiveFilterChips />}
        </header>
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-6 py-3 text-center text-[11px] text-slate-400">
          Data processed locally from “Internship Batch 2024 – Sheet1”. No data leaves this computer.
        </footer>
      </div>
    </div>
  );
}
