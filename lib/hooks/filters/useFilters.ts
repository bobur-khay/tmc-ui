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
    let filterOptionResults: Filters;

    if (process.env.TMC_SERVER_URL) {
      filterOptionResults = await getAvailableFilterOptionsServer(
        authorizationHeader ?? '',
        signal,
      );
    } else {
      filterOptionResults = await getAvailableFilterOptionsClient();
    }

    if (signal.aborted) return;
    availableFilters.current = filterOptionResults;
    debug('Setting available filters');
    setFilters(filterOptionResults);
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
