'use client';
import Dropdown from './_components/base/Dropdown';
import Button from './_components/base/Button';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import InventoryResults from './_components/inventory/InventoryResults';
import Pagination from './_components/Pagination';
import { Search, type SearchProgress } from './_components/filters/Search';
import { SideBar } from './_components/sidebar/SideBar';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchApiDataInventory } from '@/lib/services/apiData';
import { fetchLocalDataInventory } from '@/lib/services/localData';
import {
  EMPTY_FILTERS,
  type Filters,
  type CheckedFilterOptions,
  type FilterKey,
} from './_components/filters/types';
import {
  getAvailableFilterOptionsServer,
  getAvailableFilterOptionsClient,
} from './_components/sidebar/utils';
import { ErrorUI } from './_components/error/ErrorUI';
import { type InventoryItem } from './_components/inventory/types';
import { INVENTORY_PAGE_SIZE_KEY, INVENTORY_VIEW_KEY } from '@/lib/utils/constants';
import { getLocalStorage, setLocalStorage } from '@/lib/utils/storage';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const FILTER_DEBOUNCE_MS = 800;

// TODO: Implement proper error message display in the app
// TODO: Implement additive search and filtering. When additively nothing is found tell the user to try exclusive search
export default function InventoryLoad() {
  const { authorizationHeader } = useAuth();

  /* Inventory */
  // All inventory items fetched during load
  const [baseInventory, setBaseInventory] = useState<InventoryItem[]>([]);
  // Filtered items for the current page
  const [filteredInventoryPage, setFilteredInventoryPage] = useState<InventoryItem[]>([]);
  // Total number of inventory items matching the current filters
  const [totalFilteredInventoryCount, setTotalFilteredInventoryCount] = useState(0);
  const isInitialLoad = useRef(true);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  /* Grid/List view */
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const handleViewChange = (nextView: 'grid' | 'list') => {
    setView(nextView);
    try {
      setLocalStorage(nextView, INVENTORY_VIEW_KEY);
    } catch (error) {
      console.warn('Could not save the results view preference', error);
    }
  };

  /* Pagination */
  const [pageNumber, setPageNumber] = useState<number>(1);
  // used for rendering the page size dropdown
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  // used for functions that need immediate change in value of the page size
  const pageSizeRef = useRef<number | null>(null);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalFilteredInventoryCount / pageSize)),
    [totalFilteredInventoryCount, pageSize],
  );

  /* Filters */
  const availableFilters = useRef<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProgress, setSearchProgress] = useState<SearchProgress>(0);

  const checkedFilterOptions: CheckedFilterOptions = useMemo(() => {
    const _checkedFilterOptions = {} as CheckedFilterOptions;
    for (const filterKey of Object.keys(filters)) {
      const key = filterKey as FilterKey;
      if ('message' in filters[key]) continue;
      const filteredOptions = filters[key].filter((opt) => opt.checked).map((opt) => opt.value);
      if (filteredOptions.length === 0) continue;
      _checkedFilterOptions[key] = filteredOptions;
    }
    return _checkedFilterOptions;
  }, [filters]);

  const toggleFilter = useCallback((filterType: FilterKey, optionValue: string) => {
    setIsInventoryLoading(true);
    setFilters((prevFilters) => {
      if ('message' in prevFilters[filterType]) {
        return prevFilters;
      }
      return {
        ...prevFilters,
        [filterType]: prevFilters[filterType].map((opt) =>
          opt.value === optionValue ? { ...opt, checked: !opt.checked } : opt,
        ),
      };
    });
  }, []);

  const applyFilters = useCallback(
    async (signal: AbortSignal = new AbortController().signal) => {
      setInventoryError(null);
      setIsInventoryLoading(true);
      searchQuery.trim() && setSearchProgress(80);
      try {
        let nextFilteredInventory: InventoryItem[];
        let nextMatchingInventoryCount: number | undefined;
        if (process.env.TMC_SERVER_URL) {
          //Server Filtering
          const isSearchNFilter =
            Object.keys(checkedFilterOptions).length > 0 && searchQuery.trim();
          const [filterResponse, searchResponse] = await Promise.all([
            isInitialLoad.current || Object.keys(checkedFilterOptions).length > 0
              ? fetchApiDataInventory(
                  process.env.API_BASE,
                  { signal, authorizationHeader, filters: checkedFilterOptions },
                  isSearchNFilter || isInitialLoad.current ? undefined : pageNumber,
                  isSearchNFilter || isInitialLoad.current ? undefined : pageSize,
                )
              : undefined,
            searchQuery.trim()
              ? fetchApiDataInventory(
                  process.env.API_BASE,
                  { signal, authorizationHeader, search: searchQuery },
                  isSearchNFilter || isInitialLoad.current ? undefined : pageNumber,
                  isSearchNFilter || isInitialLoad.current ? undefined : pageSize,
                )
              : undefined,
          ]);

          if (filterResponse && searchResponse) {
            const searchTmNames = new Set(
              (searchResponse.data as InventoryItem[]).map((item) => item.tmName),
            );
            nextFilteredInventory = (filterResponse.data as InventoryItem[]).filter((item) =>
              searchTmNames.has(item.tmName),
            );
            nextMatchingInventoryCount = nextFilteredInventory.length;
            const pageStart = (pageNumber - 1) * pageSize;
            nextFilteredInventory = nextFilteredInventory.slice(pageStart, pageStart + pageSize);
          } else {
            const response = filterResponse ?? searchResponse;
            nextFilteredInventory = (response?.data as InventoryItem[] | undefined) ?? [];
            nextMatchingInventoryCount = response?.meta.page.totalElements;
          }
        } else {
          // Client Filtering
          if (isInitialLoad.current) {
            const response = await fetchLocalDataInventory(signal);
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
        }
        const nextCount = nextMatchingInventoryCount ?? nextFilteredInventory.length;
        setTotalFilteredInventoryCount(nextCount);
        setPageNumber(1);
        if (isInitialLoad.current) {
          setBaseInventory(nextFilteredInventory);
          setFilteredInventoryPage(nextFilteredInventory.slice(0, pageSize));
          isInitialLoad.current = false;
        } else {
          setFilteredInventoryPage(nextFilteredInventory);
        }
        if (!nextFilteredInventory.length) {
          setInventoryError(
            isInitialLoad.current ? 'The inventory is empty' : 'No items match these filters',
          );
        }
        return nextFilteredInventory;
      } catch (err: unknown) {
        if (signal.aborted) {
          return;
        }
        console.error(err instanceof Response ? await err.text() : err);
        setInventoryError("That didn't work. Please try again.");
      } finally {
        searchQuery.trim() && setSearchProgress(100);
        if (!signal.aborted) setIsInventoryLoading(false);
      }
    },
    [baseInventory, pageSize, authorizationHeader, checkedFilterOptions, searchQuery, pageNumber],
  );
  const applyLatestFilters = useEffectEvent((signal: AbortSignal) => {
    void applyFilters(signal);
  });

  /* Debounced application of filters */
  useEffect(() => {
    if (isInitialLoad.current) return;

    /* Reset filters */
    if (!Object.keys(checkedFilterOptions).length && !searchQuery) {
      setFilteredInventoryPage(baseInventory.slice(0, pageSize));
      setTotalFilteredInventoryCount(baseInventory.length);
      setIsInventoryLoading(false);
      setInventoryError(null);
      return;
    }

    /* Apply the latest filters after a debounce */
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => applyLatestFilters(controller.signal),
      FILTER_DEBOUNCE_MS,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [applyFilters, baseInventory, checkedFilterOptions, pageSize, searchQuery]);

  /* Load the inventory and the available filters on mount */
  useEffect(() => {
    const controller = new AbortController();

    /* View Preference */
    try {
      const storedView = getLocalStorage(INVENTORY_VIEW_KEY);
      if (storedView === 'grid' || storedView === 'list') {
        setView(storedView);
      }
    } catch (error) {
      console.warn('Could not restore the results view preference', error);
    }

    /* Page Size Preference */
    try {
      const storedPageSize = Number(getLocalStorage(INVENTORY_PAGE_SIZE_KEY));
      if (PAGE_SIZE_OPTIONS.includes(storedPageSize)) {
        pageSizeRef.current = storedPageSize;
        setPageSize(storedPageSize);
      }
    } catch (error) {
      console.warn('Could not restore the page size preference', error);
    }

    /* Load available filters */
    async function loadFilters() {
      let filterOptionResults: Filters;

      if (process.env.TMC_SERVER_URL) {
        filterOptionResults = await getAvailableFilterOptionsServer(
          authorizationHeader ?? '',
          controller.signal,
        );
      } else {
        filterOptionResults = await getAvailableFilterOptionsClient();
      }

      if (controller.signal.aborted) return;
      availableFilters.current = filterOptionResults;
      setFilters(filterOptionResults);
    }
    void loadFilters().catch((err: unknown) => {
      if (!controller.signal.aborted) console.error(err);
    });
    void applyFilters(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChangeServer = useCallback(
    async (newPage: number) => {
      if (!process.env.TMC_SERVER_URL) return;
      setPageNumber(newPage);

      const controller = new AbortController();

      try {
        const { data } = await fetchApiDataInventory(
          process.env.API_BASE,
          {
            signal: controller.signal,
            authorizationHeader,
            filters: checkedFilterOptions,
          },
          newPage,
          pageSize,
        );

        setFilteredInventoryPage(data as InventoryItem[]);
      } catch {
        if (controller.signal.aborted) return;
        setInventoryError('Could not fetch inventory data');
      }
    },
    [authorizationHeader, checkedFilterOptions, pageSize],
  );

  // Pagination
  const handlePageSizeChangeServer = useCallback(
    async (newPageSize: number) => {
      setPageSize(newPageSize);
      setPageNumber(1);

      try {
        setLocalStorage(String(newPageSize), INVENTORY_PAGE_SIZE_KEY);
      } catch (error) {
        console.warn('Could not save the page size preference', error);
      }

      if (!process.env.TMC_SERVER_URL) return;

      const controller = new AbortController();

      try {
        const { data } = await fetchApiDataInventory(
          process.env.API_BASE,
          {
            signal: controller.signal,
            authorizationHeader,
            filters: checkedFilterOptions,
          },
          1,
          newPageSize,
        );

        setFilteredInventoryPage(data as InventoryItem[]);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error(err);
      }
    },
    [authorizationHeader, checkedFilterOptions],
  );

  const paginatedItems = useMemo<InventoryItem[]>(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredInventoryPage.slice(start, start + pageSize);
  }, [filteredInventoryPage, pageNumber, pageSize]);

  return (
    <div className="bg-surface-canvas min-h-dvh py-10">
      <main>
        <div
          id="search-bar"
          className="mb-10 flex justify-center gap-4 px-4 sm:px-6 md:flex-row md:items-center"
        >
          <div className="w-full md:w-3/4 lg:w-3/5">
            {process.env.TMC_SERVER_URL && (
              <Search
                progressState={searchProgress}
                setProgressState={setSearchProgress}
                query={searchQuery}
                setQuery={setSearchQuery}
              />
            )}
          </div>
        </div>
        <div className="max-w-screen-3xl flex flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:px-8">
          {/* Sidebar */}
          <aside className="w-full rounded-lg lg:w-1/4 lg:max-w-72" aria-label="Filters">
            <SideBar
              filters={filters}
              onFilterCheck={toggleFilter}
              resetFilters={() => {
                setFilters({ ...availableFilters.current });
                setSearchQuery('');
              }}
            />
          </aside>

          {/* Results */}
          {inventoryError ? (
            <ErrorUI
              title={
                inventoryError === 'No items match these filters' ||
                inventoryError.startsWith('No results found for "')
                  ? 'Nothing found'
                  : "Couldn't load inventory"
              }
              description={inventoryError}
              buttonText="Retry"
              buttonOnclick={applyFilters}
            />
          ) : (
            <section className="w-full flex-1 lg:w-3/4">
              <div className="text-text-primary mb-4 flex flex-wrap items-center justify-between gap-4">
                {isInventoryLoading ? (
                  <p>Loading...</p>
                ) : (
                  <p className="text-lg">
                    Showing{' '}
                    {Object.keys(checkedFilterOptions).length === 0 ? (
                      <>
                        all <span className="text-interactive-primary">{baseInventory.length}</span>{' '}
                        TMs
                      </>
                    ) : (
                      <>
                        <span className="text-(--color-icon-brand)">
                          {totalFilteredInventoryCount}
                        </span>{' '}
                        matching TM{totalFilteredInventoryCount !== 1 ? 's' : ''} from{' '}
                        {baseInventory.length}
                      </>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-text-primary flex items-center gap-2 text-sm">
                    TMs per page:
                    <Dropdown
                      id="page-size"
                      label="TMs per page"
                      value={String(pageSize)}
                      onChange={async (value) => {
                        await handlePageSizeChangeServer(Number(value));
                      }}
                      options={PAGE_SIZE_OPTIONS.map((n) => ({
                        key: String(n),
                        value: String(n),
                      }))}
                      showChevron={true}
                      className="bg-surface-canvas rounded px-2 py-1 text-sm"
                    />
                  </label>
                  <div
                    role="group"
                    aria-label="Results view"
                    className="border-border-default flex shrink-0 gap-0.5 rounded border p-0.5"
                  >
                    <Button
                      type="button"
                      aria-label="Grid view"
                      title="Grid view"
                      aria-pressed={view === 'grid'}
                      variant={view === 'grid' ? 'solid' : 'plain'}
                      onClick={() => handleViewChange('grid')}
                      className="size-6 justify-center p-0!"
                    >
                      <Squares2X2Icon className="size-5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      aria-label="List view"
                      title="List view"
                      aria-pressed={view === 'list'}
                      variant={view === 'list' ? 'solid' : 'plain'}
                      onClick={() => handleViewChange('list')}
                      className="size-6 justify-center p-0!"
                    >
                      <ListBulletIcon className="size-5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>

              {process.env.TMC_SERVER_URL ? (
                <div>
                  <InventoryResults
                    items={filteredInventoryPage}
                    loading={isInventoryLoading}
                    view={view}
                  />

                  <Pagination
                    page={pageNumber}
                    totalPages={totalPages}
                    onPageChange={handlePageChangeServer}
                  />
                </div>
              ) : (
                <div>
                  <InventoryResults
                    items={paginatedItems}
                    loading={isInventoryLoading}
                    view={view}
                  />

                  <Pagination
                    page={pageNumber}
                    totalPages={totalPages}
                    onPageChange={(p) => setPageNumber(p)}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
