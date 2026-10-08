import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/demographics', label: 'Demographics', icon: BarChart3 },
  { to: '/internships', label: 'Internships', icon: Briefcase },
  { to: '/companies', label: 'Companies & Roles', icon: Building2 },
  { to: '/stipend', label: 'Stipend Analytics', icon: IndianRupee },
  { to: '/operations', label: 'Operations', icon: ClipboardCheck },
  { to: '/student-360', label: 'Student 360', icon: UserRound },
  { to: '/data-quality', label: 'Data Quality', icon: ShieldCheck },
];

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex h-16 items-center gap-2.5 border-b border-slate-100 ${collapsed ? 'lg:justify-center lg:px-0' : ''} px-5`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-sm font-semibold text-slate-900">Placement Analytics</p>
            <p className="truncate text-[11px] text-slate-500">Student &amp; Internship Office</p>
          </div>
          <button onClick={onCloseMobile} className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                } ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className={`mb-2 rounded-lg bg-slate-50 px-3 py-2.5 ${collapsed ? 'lg:px-0 lg:text-center' : ''}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>Cohort</p>
            <p className="text-sm font-semibold text-slate-800">
              <span className={collapsed ? 'lg:hidden' : ''}>2024 Batch</span>
              <span className={`hidden ${collapsed ? 'lg:inline' : ''}`}>'24</span>
            </p>
          </div>
          <button
            onClick={onToggle}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Collapse</>)}
          </button>
        </div>
      </aside>
    </>
  );
}
