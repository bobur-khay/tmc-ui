import type {
  DataControlType,
  ApplyDataControlsParams,
  FilterKey,
  Filters,
} from '@/app/_components/data-controls/types';
import type { UseDataControlsProps } from './useDataControlsTypes';
import type { InventoryItem } from '@/app/_components/inventory/types';
import { useRef, useMemo, useCallback, useEffect } from 'react';
import { fetchApiDataInventory } from '../../services/apiData';
import { fetchLocalDataInventory } from '../../services/localData';
import { useSearch } from '../search/useSearch';
import { useAuth } from '../useAuth';
import { debug } from '@/lib/utils/debug';
import { DEFAULT_PAGE_SIZE, usePagination } from '../pagination/usePagination';
import { getLocalStorage } from '@/lib/utils/storage';
import { INVENTORY_PAGE_SIZE_KEY, INVENTORY_VIEW_KEY } from '@/lib/utils/constants';
import { PAGE_SIZE_OPTIONS } from '../useInventory';
import { useFilters } from '../filters/useFilters';

const DATA_CONTROLS_DEBOUNCE_MS = 800;

export function useDataControls({
  baseInventory,
  setBaseInventory,
  setIsInventoryLoading,
  setInventoryError,
  isInitialInventoryLoad,
  filteredInventoryPage,
  totalFilteredInventoryCount,
  setFilteredInventoryPage,
  setTotalFilteredInventoryCount,
  setTotalInventoryCount,
  setInventoryView,
}: UseDataControlsProps) {
  const { authorizationHeader } = useAuth();
  const abortSignalRef = useRef<AbortController>(new AbortController());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* Search */
  const { searchProgress, setSearchProgress, searchQuery, setSearchQuery } = useSearch();

  /* Pagination */
  const { pageNumber, setPageNumber, pageSize, setPageSize, totalPages, paginatedItems } =
    usePagination({ filteredInventoryPage, totalFilteredInventoryCount });

  /* Filters */
  const {
    filters,
    setFilters,
    getCheckedFilterOptions,
    checkedFilterOptions,
    availableFilters,
    loadAvailableFilters,
  } = useFilters();

  /* Data Controls Logic */
  const dataControlToStateMap: Record<DataControlType, [any, (value: any) => void]> = useMemo(
    () => ({
      search: [searchQuery, setSearchQuery],
      filters: [filters, setFilters],
      pageNumber: [pageNumber, setPageNumber],
      pageSize: [pageSize, setPageSize],
    }),
    [
      filters,
      pageNumber,
      pageSize,
      searchQuery,
      setFilters,
      setPageNumber,
      setPageSize,
      setSearchQuery,
    ],
  );

  const resetDataControls = async () => {
    await applyDataControls({
      nextDataControls: {
        search: '',
        filters: Object.entries(filters).reduce((acc, [key, value]) => {
          if ('message' in value) {
            acc[key as FilterKey] = value;
          } else {
            acc[key as FilterKey] = value.map((opt) => ({
              ...opt,
              checked: false,
            }));
          }
          return acc;
        }, {} as Filters),
        pageNumber: 1,
        pageSize,
      },
    });
  };

  const applyDataControls = useCallback(
    async ({ nextDataControls }: ApplyDataControlsParams) => {
      debug('Setting inventory to loading');
      setIsInventoryLoading(true);
      setInventoryError(null);
      debug('Applying data controls with next options:', nextDataControls);
      debug('Updating state for data controls');
      (Object.keys(nextDataControls) as DataControlType[]).forEach((key) => {
        const [, setState] = dataControlToStateMap[key];
        setState(nextDataControls[key]);
      });
      timeoutRef.current && clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        const nextDataControlValues: Record<DataControlType, any> = {
          search: (nextDataControls.search ?? searchQuery).trim(),
          filters: nextDataControls.filters
            ? getCheckedFilterOptions(nextDataControls.filters)
            : checkedFilterOptions,
          pageNumber: nextDataControls.pageNumber ?? pageNumber,
          pageSize: nextDataControls.pageSize ?? pageSize,
        };

        abortSignalRef.current.abort();
        abortSignalRef.current = new AbortController();
        searchQuery.trim() && setSearchProgress(80);
        try {
          let nextFilteredInventory: InventoryItem[];
          let nextFilteredInventoryCount: number;
          if (process.env.TMC_SERVER_URL) {
            //Server Filtering
            debug('Applying server filters');
            const hasSearchDataControl = nextDataControlValues.search.length > 0;
            const hasFilterControls = nextDataControlValues.filters.length > 0;
            const isSearchNFilter = hasSearchDataControl && hasFilterControls;

            const [filterResponse, searchResponse] = await Promise.all([
              isInitialInventoryLoad.current || !isSearchNFilter || hasFilterControls
                ? fetchApiDataInventory(
                    process.env.API_BASE,
                    {
                      signal: abortSignalRef.current.signal,
                      authorizationHeader,
                      filters: nextDataControlValues.filters,
                    },
                    isSearchNFilter ? undefined : nextDataControlValues.pageNumber,
                    isSearchNFilter ? undefined : nextDataControlValues.pageSize,
                  )
                : undefined,
              hasSearchDataControl
                ? fetchApiDataInventory(
                    process.env.API_BASE,
                    {
                      signal: abortSignalRef.current.signal,
                      authorizationHeader,
                      search: nextDataControlValues.search,
                    },
                    isSearchNFilter ? undefined : nextDataControlValues.pageNumber,
                    isSearchNFilter ? undefined : nextDataControlValues.pageSize,
                  )
                : undefined,
            ]);
            debug('Filter response:', filterResponse);
            debug('Search response:', searchResponse);

            if (filterResponse && searchResponse) {
              debug('Both filter and search applied');
              const searchTmNames = new Set(
                (searchResponse.data as InventoryItem[]).map((item) => item.tmName),
              );
              nextFilteredInventory = (filterResponse.data as InventoryItem[]).filter((item) =>
                searchTmNames.has(item.tmName),
              );
              const pageStart =
                (nextDataControlValues.pageNumber - 1) * nextDataControlValues.pageSize;
              nextFilteredInventory = nextFilteredInventory.slice(
                pageStart,
                pageStart + nextDataControlValues.pageSize,
              );
              nextFilteredInventoryCount = nextFilteredInventory.length;
            } else {
              const response = filterResponse ?? searchResponse;
              nextFilteredInventory = (response?.data as InventoryItem[] | undefined) ?? [];
              nextFilteredInventoryCount = response?.meta.page.totalElements ?? 0;
            }
          } else {
            // Client Filtering
            // TODO: apply additive filtering and search
            debug('Applying client filters');
            if (isInitialInventoryLoad.current) {
              const response = await fetchLocalDataInventory(abortSignalRef.current.signal);
              const filteredInventory = response.filter((item) => item['schema:mpn'] !== '');
              nextFilteredInventory = filteredInventory;
            } else {
              nextFilteredInventory = baseInventory.filter((item) => {
                const matchesCatalog =
                  !checkedFilterOptions.repository?.length ||
                  checkedFilterOptions.repository?.includes(item.repo);
                const matchesManufacturer =
                  !checkedFilterOptions.manufacturer?.length ||
                  checkedFilterOptions.manufacturer?.includes(
                    item['schema:manufacturer']?.['schema:name'],
                  );
                const matchesAuthor =
                  !checkedFilterOptions.author?.length ||
                  checkedFilterOptions.author?.some((author) =>
                    item.name?.toLowerCase().includes(author.toLowerCase()),
                  );
                return matchesCatalog && matchesManufacturer && matchesAuthor;
              });
            }
            nextFilteredInventoryCount = nextFilteredInventory.length;
          }
          debug('Setting total filtered inventory count:', nextFilteredInventoryCount);
          setTotalFilteredInventoryCount(nextFilteredInventoryCount);
          if (isInitialInventoryLoad.current) {
            debug('Initial load complete, setting base inventory');
            setBaseInventory(nextFilteredInventory);
            debug('Setting total inventory count: ', nextFilteredInventoryCount);
            setTotalInventoryCount(nextFilteredInventoryCount);
            isInitialInventoryLoad.current = false;
          }
          setFilteredInventoryPage(nextFilteredInventory);
          if (!nextFilteredInventory.length) {
            setInventoryError(
              isInitialInventoryLoad.current
                ? 'The inventory is empty'
                : 'No items match these filters',
            );
          }
          return nextFilteredInventory;
        } catch (err: unknown) {
          console.error(err instanceof Response ? await err.text() : err);
          if (abortSignalRef.current.signal.aborted) {
            return;
          }
          setInventoryError("That didn't work. Please try again.");
        } finally {
          searchQuery.trim() && setSearchProgress(100);
          setIsInventoryLoading(false);
        }
      }, DATA_CONTROLS_DEBOUNCE_MS);
    },
    [
      authorizationHeader,
      baseInventory,
      checkedFilterOptions,
      dataControlToStateMap,
      getCheckedFilterOptions,
      isInitialInventoryLoad,
      pageNumber,
      pageSize,
      searchQuery,
      setBaseInventory,
      setFilteredInventoryPage,
      setInventoryError,
      setIsInventoryLoading,
      setSearchProgress,
      setTotalFilteredInventoryCount,
      setTotalInventoryCount,
    ],
  );

  useEffect(() => {
    debug('Starting initial load');

    /* View Preference */
    try {
      const storedView = getLocalStorage(INVENTORY_VIEW_KEY);
      if (storedView === 'grid' || storedView === 'list') {
        debug(`Setting view preference to "${storedView}"`);
        setInventoryView(storedView);
      }
    } catch (error) {
      console.warn('Could not restore the results view preference', error);
    }

    /* Page Size Preference */
    let pageSize = DEFAULT_PAGE_SIZE;
    try {
      const storedPageSize = Number(getLocalStorage(INVENTORY_PAGE_SIZE_KEY));
      if (PAGE_SIZE_OPTIONS.includes(storedPageSize)) {
        setPageSize(storedPageSize); // triggers application of filters
        pageSize = storedPageSize;
        debug('Setting page size preference to', storedPageSize);
      }
    } catch (error) {
      setPageSize(DEFAULT_PAGE_SIZE); // triggers application of filters
      console.warn('Could not restore the page size preference', error);
    }

    /* Load inventory */
    void applyDataControls({ nextDataControls: { pageSize } });

    /* Load available filters */
    void loadAvailableFilters(abortSignalRef.current.signal).catch((err: unknown) => {
      if (!abortSignalRef.current.signal.aborted) console.error(err);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      abortSignalRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFilter = useCallback(
    async (filterType: FilterKey, optionValue: string) => {
      if ('message' in filters[filterType]) return;
      await applyDataControls({
        nextDataControls: {
          filters: {
            ...filters,
            [filterType]: filters[filterType].map((opt) =>
              opt.value === optionValue ? { ...opt, checked: !opt.checked } : opt,
            ),
          },
        },
      });
    },
    [applyDataControls, filters],
  );

  return {
    filters,
    setFilters,
    toggleFilter,
    resetDataControls,
    applyDataControls,
    availableFilters,
    checkedFilterOptions,

    /* Search */
    searchQuery,
    setSearchQuery,
    searchProgress,

    /* Pagination */
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
  };
}
