'use client';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../lib/hooks/useAuth';
import { initialFilters, type FilterKey, type Filters, type FilterData } from './types';
import { getAvailableFilterOptionsClient, getAvailableFilterOptionsServer } from './utils';
import { fetchApiDataInventory } from '@/lib/services/apiData';
import Search from '../Search';
import SideBar from '../SideBar';

export interface FilterProviderProps {
  readonly loadedItems: Item[];
}
export function Inventory({ loadedItems }: FilterProviderProps) {
  const { authorizationHeader } = useAuth();
  // Is greater than 0, handled in /page.tsx
  const itemsCount = loadedItems.length;

  // Sidebar Filters State
  const [filters, setFilters] = useState<Filters>(initialFilters);
  // Use updateFilter() instead of setFilters()
  // filters is an object and needs to be updated accordingly
  function updateFilter(filterType: FilterKey, value: FilterData[]) {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [filterType]: value,
    }));
  }

  // Data Fetching State
  const [areAvailableFiltersLoading, setAreAvailableFiltersLoading] = useState<boolean>(true);

  // Load available filter options on component mount
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setAreAvailableFiltersLoading(true);
      let filterOptionResults: Filters;

      if (process.env.SERVER_AVAILABLE) {
        filterOptionResults = await getAvailableFilterOptionsServer(
          authorizationHeader ?? '',
          controller.signal,
        );
      } else {
        filterOptionResults = await getAvailableFilterOptionsClient();
      }

      setFilters(filterOptionResults);
      setAreAvailableFiltersLoading(false);
    }

    void loadData();
    return () => controller.abort();
  }, [authorizationHeader]);

  const [filteredItems, setFilteredItems] = useState<Item[]>(loadedItems);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // filterInventory depends on checkedFilterOptions, thus needs useMemo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkedFilterOptions = useMemo(() => ({}) as Record<FilterKey, string[]>, [filters]);

  for (const filterKey of Object.keys(filters)) {
    const key = filterKey as FilterKey;
    if ('errorMessage' in filters[key]) continue;
    const filteredOptions = filters[key].filter((opt) => opt.checked).map((opt) => opt.value);
    if (filteredOptions.length === 0) continue;
    checkedFilterOptions[key] = filteredOptions;
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / pageSize)),
    [filteredItems.length, pageSize],
  );

  const filterInventory = useCallback(async () => {
    setFilterError(null);
    if (process.env.SERVER_URL) {
      //Server Filtering
      const controller = new AbortController();

      try {
        const { data } = await fetchApiDataInventory(
          process.env.API_BASE,
          {
            signal: controller.signal,
            authorizationHeader,
            filters: checkedFilterOptions,
          },
          page,
          pageSize,
        );

        setFilteredItems(data as Item[]);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(err);
        setFilterError("That didn't work. Please try again.");
      }
    } else {
      // Client Filtering
      const nextFilteredItems = loadedItems.filter((item) => {
        const matchesCatalog =
          checkedFilterOptions.repository?.length === 0 ||
          checkedFilterOptions.repository?.includes(item.repo);
        const matchesManufacturer =
          checkedFilterOptions.manufacturer?.length === 0 ||
          checkedFilterOptions.manufacturer?.includes(item['schema:manufacturer']?.['schema:name']);
        const matchesAuthor =
          checkedFilterOptions.author?.length === 0 ||
          checkedFilterOptions.author?.some((author) =>
            item.name?.toLowerCase().includes(author.toLowerCase()),
          );

        return matchesCatalog && matchesManufacturer && matchesAuthor;
      });

      setFilteredItems(nextFilteredItems);
      setPage(1);
    }
  }, [authorizationHeader, checkedFilterOptions, loadedItems, page, pageSize]);

  const paginatedItems = useMemo<Item[]>(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Defer the heavy grid updates so checkbox/filter interactions paint immediately
  // while the (memoized) GridList re-renders at a lower priority.
  const deferredPaginatedItems = useDeferredValue(paginatedItems);
  const deferredFilteredItems = useDeferredValue(filteredItems);

  const handleFilterCheck = (filterKey: FilterKey, optionValue: string, checked: boolean) => {
    setFilters((prev) => {
      const filterOptions = prev[filterKey];
      if ('errorMessage' in filterOptions) return prev;
      return {
        ...prev,
        [filterKey]: filterOptions.map((opt) =>
          opt.value === optionValue ? { ...opt, checked } : opt,
        ),
      };
    });
  };

  const handleSearchResults = useCallback((results: Item[]) => {
    setFilteredItems(results);
    setPage(1);
  }, []);

  const handlePageChangeServer = useCallback(
    async (newPage: number) => {
      if (!process.env.SERVER_URL) return;
      setPage(newPage);

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

        setFilteredItems(data as Item[]);
      } catch {
        if (controller.signal.aborted) return;
        setPageError('Could not fetch inventory data');
      }
    },
    [authorizationHeader, checkedFilterOptions, pageSize],
  );

  const handlePageSizeChangeServer = useCallback(
    async (newPageSize: number) => {
      setPageSize(newPageSize);
      setPage(1);

      if (!process.env.SERVER_URL) return;

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

        setFilteredItems(data as Item[]);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error(err);
      }
    },
    [authorizationHeader, checkedFilterOptions],
  );

  const resetFilters = () => {
    setSearchQuery('');
    setFilters((prev) => {
      const newFilters = { ...prev };
      for (const key of Object.keys(newFilters)) {
        const filterKey = key as FilterKey;
        if ('errorMessage' in newFilters[filterKey]) continue;
        const newOptions = newFilters[filterKey].map((opt) => ({ ...opt, checked: false }));
        newFilters[filterKey] = newOptions;
      }
      return newFilters;
    });
    setPage(1);
  };

  return (
    <>
      <div className="bg-surface-canvas min-h-dvh py-10">
        <main>
          <div
            id="search-bar"
            className="mb-10 flex justify-center gap-4 px-4 sm:px-6 md:flex-row md:items-center"
          >
            <div className="w-full md:w-3/4 lg:w-3/5">
              {process.env.SERVER_URL && (
                <Search
                  query={searchQuery}
                  onSearch={setSearchQuery}
                  onResultsChange={handleSearchResults}
                  baseItems={loadedItems}
                  authorizationHeader={authorizationHeader}
                />
              )}
            </div>
          </div>

          <div className="max-w-screen-3xl flex flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:px-8">
            {/* Sidebar */}
            <aside className="w-full rounded-lg lg:w-1/4 lg:max-w-72" aria-label="Filters">
              <SideBar
                filters={filters}
                onFilterCheck={handleFilterCheck}
                resetFilters={resetFilters}
              />
            </aside>

            {/* Results */}
            <section className="w-full flex-1 lg:w-3/4">
              <div className="text-text-primary mb-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-lg">
                  <span className="text-[var(--color-icon-brand)]">{resultCounts}</span> result
                  {resultCounts !== 1 ? 's' : ''} found in the catalog with {totalElements} TMs in
                  total
                </p>

                <label className="text-text-primary flex items-center gap-2 text-sm">
                  TMs per page:
                  <Dropdown
                    id="page-size"
                    label="TMs per page"
                    value={String(pageSize)}
                    onChange={(value) => {
                      handlePageSizeChangeServer(Number(value));
                    }}
                    options={[10, 20, 50, 100].map((n) => ({
                      key: String(n),
                      value: String(n),
                    }))}
                    showChevron={true}
                    className="bg-surface-canvas rounded px-2 py-1 pr-10 text-sm"
                  />
                </label>
                {searchQuery && filteredItems.length === 0 && (
                  <span className="text-text-secondary text-sm">
                    (No matches for "{searchQuery}")
                  </span>
                )}
              </div>

              {!process.env.SERVER_URL && (
                <div>
                  {areAvailableFiltersLoading && <Loader text="Loading catalog..." />}
                  {!areAvailableFiltersLoading && (
                    <GridList items={deferredPaginatedItems} loading={isLoading} />
                  )}

                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                  />
                </div>
              )}

              {process.env.SERVER_URL && (
                <div>
                  {areAvailableFiltersLoading && <Loader text="Loading catalog..." />}
                  {!areAvailableFiltersLoading && (
                    <GridList items={deferredFilteredItems} loading={isLoading} />
                  )}

                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChangeServer}
                  />
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
