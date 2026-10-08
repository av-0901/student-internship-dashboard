import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Compass className="h-10 w-10 text-slate-300" />
      <h1 className="text-lg font-semibold text-slate-800">Page not found</h1>
      <p className="text-sm text-slate-500">The page you requested does not exist.</p>
      <Link to="/dashboard" className="btn-primary mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
