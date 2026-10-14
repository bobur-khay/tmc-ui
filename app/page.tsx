'use client';
import Loader from './_components/base/Loader';
import Dropdown from './_components/base/Dropdown';
import Button from './_components/base/Button';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import InventoryResults from './_components/inventory/InventoryResults';
import Pagination from './_components/Pagination';
import { Search } from './_components/Search';
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

const DEFAULT_PAGE_SIZE = 20;
const FILTER_DEBOUNCE_MS = 800;

// TODO: check if signals are actually necessary
export default function InventoryLoad() {
  const { authorizationHeader } = useAuth();

  // Inventory
  const [baseInventory, setBaseInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(baseInventory.length / pageSize)),
    [pageSize, baseInventory],
  );

  // Filters
  const [initialFilters, setInitialFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [areAvailableFiltersLoading, setAreAvailableFiltersLoading] = useState<boolean>(true);
  const haveFiltersInitialized = useRef(false);

  // filterInventory depends on checkedFilterOptions, thus needs useMemo()
  const checkedFilterOptions: CheckedFilterOptions = useMemo(() => {
    const _checkedFilterOptions = {} as CheckedFilterOptions;
    for (const filterKey of Object.keys(filters)) {
      const key = filterKey as FilterKey;
      if ('errorMessage' in filters[key]) continue;
      const filteredOptions = filters[key].filter((opt) => opt.checked).map((opt) => opt.value);
      if (filteredOptions.length === 0) continue;
      _checkedFilterOptions[key] = filteredOptions;
    }
    return _checkedFilterOptions;
  }, [filters]);

  const toggleFilter = useCallback((filterType: FilterKey, optionValue: string) => {
    setIsInventoryLoading(true);
    setFilters((prevFilters) => {
      if ('errorMessage' in prevFilters[filterType]) {
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

  const resetFilters = useCallback(() => {
    setIsInventoryLoading(true);
    setFilters({ ...initialFilters });
  }, [initialFilters]);

  const applyFilters = useCallback(
    async ({
      isInitialLoad,
      isReset,
      signal = new AbortController().signal,
    }: {
      isInitialLoad?: boolean;
      isReset?: boolean;
      signal?: AbortSignal;
    }) => {
      setInventoryError(null);
      setIsInventoryLoading(true);
      try {
        let nextFilteredInventory: InventoryItem[];
        if (isReset) {
          nextFilteredInventory = baseInventory;
        } else {
          if (process.env.TMC_SERVER_URL) {
            //Server Filtering
            const { data } = await fetchApiDataInventory(
              process.env.API_BASE,
              {
                signal,
                authorizationHeader,
                filters: checkedFilterOptions,
              },
              isInitialLoad ? undefined : page,
              isInitialLoad ? undefined : pageSize,
            );
            nextFilteredInventory = data as InventoryItem[];
          } else {
            // Client Filtering
            if (isInitialLoad) {
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
        }
        if (signal.aborted) return;
        setPage(1);
        if (isInitialLoad) {
          setBaseInventory(nextFilteredInventory);
          setFilteredInventory(nextFilteredInventory.slice(0, pageSize));
        } else {
          setFilteredInventory(nextFilteredInventory);
        }
        if (!nextFilteredInventory.length) {
          setInventoryError(
            isInitialLoad ? 'The inventory is empty' : 'No items match these filters',
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
        if (!signal.aborted) setIsInventoryLoading(false);
      }
    },
    [authorizationHeader, checkedFilterOptions, baseInventory, page, pageSize],
  );

  const applyLatestFilters = useEffectEvent((signal: AbortSignal) => {
    void applyFilters({
      isReset: !Object.keys(checkedFilterOptions).length,
      signal,
    });
  });

  useEffect(() => {
    if (areAvailableFiltersLoading) return;
    if (!haveFiltersInitialized.current) {
      haveFiltersInitialized.current = true;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => applyLatestFilters(controller.signal),
      Object.keys(checkedFilterOptions).length ? FILTER_DEBOUNCE_MS : 0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [checkedFilterOptions, areAvailableFiltersLoading]);

  // Load the inventory and the available filters on mount
  useEffect(() => {
    const controller = new AbortController();

    async function loadFilters() {
      setAreAvailableFiltersLoading(true);
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
      setInitialFilters(filterOptionResults);
      setFilters(filterOptionResults);
      setAreAvailableFiltersLoading(false);
    }

    void applyFilters({ isInitialLoad: true, signal: controller.signal });
    void loadFilters().catch((err: unknown) => {
      if (!controller.signal.aborted) console.error(err);
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO: when changed while search results are shown, the result gets reset
  const handlePageChangeServer = useCallback(
    async (newPage: number) => {
      if (!process.env.TMC_SERVER_URL) return;
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

        setFilteredInventory(data as InventoryItem[]);
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
      setPage(1);

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

        setFilteredInventory(data as InventoryItem[]);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error(err);
      }
    },
    [authorizationHeader, checkedFilterOptions],
  );

  const onSearchResponse = useCallback(
    (results: InventoryItem[], query: string) => {
      setFilteredInventory(results);
      setPage(1);
      if (results.length === 0) {
        setInventoryError(`No results found for "${query}"`);
      }
    },
    [setFilteredInventory, setInventoryError, setPage],
  );

  const paginatedItems = useMemo<InventoryItem[]>(() => {
    const start = (page - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [filteredInventory, page, pageSize]);

  return (
    <>
      <div className="bg-surface-canvas min-h-dvh py-10">
        <main>
          <div
            id="search-bar"
            className="mb-10 flex justify-center gap-4 px-4 sm:px-6 md:flex-row md:items-center"
          >
            <div className="w-full md:w-3/4 lg:w-3/5">
              {process.env.TMC_SERVER_URL && (
                <Search
                  onSearchResponse={onSearchResponse}
                  baseInventory={baseInventory}
                  setError={setInventoryError}
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
                resetFilters={resetFilters}
                areAvailableFiltersLoading={areAvailableFiltersLoading}
              />
            </aside>

            {/* Results */}
            {inventoryError ? (
              <ErrorUI
                title={
                  inventoryError === 'No items match these filters'
                    ? 'Nothing found'
                    : "Couldn't load inventory"
                }
                description={inventoryError}
                buttonText="Retry"
                buttonOnclick={() => applyFilters({})}
              />
            ) : (
              <section className="w-full flex-1 lg:w-3/4">
                <div className="text-text-primary mb-4 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-lg">
                    Showing{' '}
                    <span className="text-(--color-icon-brand)">{filteredInventory.length}</span>{' '}
                    matching TM
                    {filteredInventory.length !== 1 ? 's' : ''} from {baseInventory.length}
                  </p>

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
                        options={[10, 20, 50, 100].map((n) => ({
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
                        onClick={() => setView('grid')}
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
                        onClick={() => setView('list')}
                        className="size-6 justify-center p-0!"
                      >
                        <ListBulletIcon className="size-5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>

                {process.env.TMC_SERVER_URL ? (
                  <div>
                    {areAvailableFiltersLoading && <Loader text="Loading catalog..." />}
                    {!areAvailableFiltersLoading && (
                      <InventoryResults
                        items={filteredInventory}
                        loading={isInventoryLoading}
                        view={view}
                      />
                    )}

                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={handlePageChangeServer}
                    />
                  </div>
                ) : (
                  <div>
                    {areAvailableFiltersLoading && <Loader text="Loading catalog..." />}
                    {!areAvailableFiltersLoading && (
                      <InventoryResults
                        items={paginatedItems}
                        loading={isInventoryLoading}
                        view={view}
                      />
                    )}

                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={(p) => setPage(p)}
                    />
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
