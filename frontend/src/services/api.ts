import axios from 'axios';
import type {
  CompaniesResponse,
  DataQualityResponse,
  DemographicsResponse,
  FilterOptions,
  Filters,
  Internship,
  InternshipsResponse,
  OperationsResponse,
  PageQuery,
  Paginated,
  Row,
  StipendResponse,
  StudentDetail,
  StudentRow,
  SummaryResponse,
} from '../types';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const http = axios.create({ baseURL: `${API_BASE}/api`, timeout: 20000 });

function clean(params: object): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number;
  });
  return out;
}

async function get<T>(url: string, params: object = {}): Promise<T> {
  const res = await http.get<T>(url, { params: clean(params) });
  return res.data;
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return `Cannot reach the API at ${API_BASE}. Is the backend running?`;
    const detail = (err.response.data as { detail?: unknown })?.detail;
    if (typeof detail === 'string') return detail;
    return `Request failed (${err.response.status})`;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}

export const api = {
  health: () => get<{ status: string; students: number; internship_records: number; data_generated_at: string }>('/health'),
  filters: () => get<FilterOptions>('/filters'),
  summary: (f: Filters) => get<SummaryResponse>('/summary', f),
  students: (f: Filters, p: PageQuery) => get<Paginated<StudentRow>>('/students', { ...f, ...p }),
  student: (id: string) => get<StudentDetail>(`/students/${encodeURIComponent(id)}`),
  studentInternships: (id: string) => get<Internship[]>(`/student/${encodeURIComponent(id)}/internships`),
  internships: (f: Filters, p: PageQuery) => get<InternshipsResponse>('/internships', { ...f, ...p }),
  companies: (f: Filters, p: PageQuery) => get<CompaniesResponse>('/companies', { ...f, ...p }),
  roles: (f: Filters, p: PageQuery) => get<Paginated<Row>>('/roles', { ...f, ...p }),
  demographics: (f: Filters) => get<DemographicsResponse>('/demographics', f),
  stipend: (f: Filters) => get<StipendResponse>('/stipend', f),
  operations: (f: Filters) => get<OperationsResponse>('/operations', f),
  dataQuality: () => get<DataQualityResponse>('/data-quality'),
};

export async function downloadExport(kind: 'students' | 'internships', f: Filters): Promise<void> {
  const res = await http.get(`/export/${kind}`, { params: clean(f), responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${kind}_2024.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
