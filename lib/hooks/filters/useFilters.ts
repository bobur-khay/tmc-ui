import type {
  CheckedFilterOptions,
  FilterKey,
  Filters,
} from '@/app/_components/data-controls/types';
import { EMPTY_FILTERS } from '@/app/_components/data-controls/types';
import {
  getAvailableFilterOptionsClient,
  getAvailableFilterOptionsServer,
} from '@/app/_components/sidebar/utils';
import { useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../useAuth';
import { debug } from '@/lib/utils/debug';

export function useFilters() {
  const { authorizationHeader } = useAuth();
  /* Filters */
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const availableFilters = useRef<Filters>(EMPTY_FILTERS);
  const getCheckedFilterOptions = useCallback((filters: Filters) => {
    const checkedFilterOptions = {} as CheckedFilterOptions;
    for (const filterKey of Object.keys(filters)) {
      const key = filterKey as FilterKey;
      if ('message' in filters[key]) continue;
      const filteredOptions = filters[key].filter((opt) => opt.checked).map((opt) => opt.value);
      if (filteredOptions.length === 0) continue;
      checkedFilterOptions[key] = filteredOptions;
    }
    return checkedFilterOptions;
  }, []);
  const checkedFilterOptions: CheckedFilterOptions = useMemo(
    () => getCheckedFilterOptions(filters),
    [filters, getCheckedFilterOptions],
  );

  const loadAvailableFilters = async (signal: AbortSignal) => {
    let filterOptionResults: Omit<Filters, 'changedSince'>;

    if (process.env.TMC_SERVER_URL) {
      filterOptionResults = await getAvailableFilterOptionsServer(
        authorizationHeader ?? '',
        signal,
      );
    } else {
      filterOptionResults = await getAvailableFilterOptionsClient(signal);
    }

    if (signal.aborted) return;
    const loadedFilters: Filters = { ...EMPTY_FILTERS, ...filterOptionResults };
    availableFilters.current = loadedFilters;
    debug('Setting available filters');
    // Keep options that were checked (e.g. from the URL) before the available options loaded
    setFilters((current) => {
      const merged: Filters = { ...loadedFilters };
      for (const filterKey of Object.keys(current)) {
        const key = filterKey as FilterKey;
        const currentOptions = current[key];
        const loadedOptions = loadedFilters[key];
        if ('message' in currentOptions) continue;
        if ('message' in loadedOptions) {
          merged[key] = currentOptions;
          continue;
        }
        const checked = new Set(
          currentOptions.filter((opt) => opt.checked).map((opt) => opt.value),
        );
        const loadedValues = new Set(loadedOptions.map((opt) => opt.value));
        merged[key] = [
          ...loadedOptions.map((opt) => ({ ...opt, checked: checked.has(opt.value) })),
          ...currentOptions.filter((opt) => opt.checked && !loadedValues.has(opt.value)),
        ];
      }
      return merged;
    });
  };

  return {
    availableFilters,
    filters,
    setFilters,
    getCheckedFilterOptions,
    checkedFilterOptions,
    loadAvailableFilters,
  };
}
