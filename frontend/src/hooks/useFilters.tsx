import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { FilterOptions, Filters } from '../types';

interface FilterContextValue {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string | undefined) => void;
  setFilters: (f: Filters) => void;
  reset: () => void;
  activeCount: number;
  options: FilterOptions | null;
  optionsError: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);
const STORAGE_KEY = 'sia-2024-filters';

function load(): Filters {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Filters;
  } catch {
    return {};
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(load);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState(false);

  useEffect(() => {
    api.filters().then(setOptions).catch(() => setOptionsError(true));
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const setFilter = useCallback((key: keyof Filters, value: string | undefined) => {
    setFiltersState((f) => {
      const next = { ...f };
      if (value === undefined || value === '') delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const setFilters = useCallback((f: Filters) => setFiltersState(f), []);
  const reset = useCallback(() => setFiltersState({}), []);

  const value = useMemo(
    () => ({
      filters,
      setFilter,
      setFilters,
      reset,
      activeCount: Object.values(filters).filter((v) => v !== undefined && v !== '').length,
      options,
      optionsError,
    }),
    [filters, setFilter, setFilters, reset, options, optionsError],
  );
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider');
  return ctx;
}
