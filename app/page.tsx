'use client';
import { useEffect } from 'react';
import { useInventoryContext } from './_components/inventory/InventoryProvider';
import Dropdown from './_components/base/Dropdown';
import Button from './_components/base/Button';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import InventoryResults from './_components/inventory/InventoryResults';
import Pagination from './_components/Pagination';
import { Search } from './_components/data-controls/Search';
import { SideBar } from './_components/sidebar/SideBar';
import { ErrorUI } from './_components/error/ErrorUI';
import { INVENTORY_PAGE_SIZE_KEY } from '@/lib/utils/constants';
import { setLocalStorage } from '@/lib/utils/storage';
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/useInventory';

// TODO: Implement proper error message display in the app
// TODO: Implement additive search and filtering. When additively nothing is found tell the user to try exclusive search
export default function InventoryLoad() {
  const {
    /* Inventory */
    totalInventoryCount,
    totalFilteredInventoryCount,
    filteredInventoryPage,
    inventoryError,
    isInventoryLoading,
    inventoryView,
    setInventoryView,

    /* Filters */
    filters,
    changedSince,
    toggleFilter,
    resetDataControls,
    checkedFilterOptions,
    applyDataControls,

    /* Search */
    searchQuery,
    searchProgress,

    /* Pagination */
    pageNumber,
    pageSize,
    totalPages,
    paginatedItems,
    lastOpenedTM,
  } = useInventoryContext();

  useEffect(() => {
    if (isInventoryLoading || !lastOpenedTM.current) return;
    const element = document.getElementById(lastOpenedTM.current);
    // Defer until after Next.js' route scroll handling has run.
    const frame = requestAnimationFrame(() => {
      element?.scrollIntoView({ behavior: 'instant', block: 'center' });
      element?.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [isInventoryLoading, lastOpenedTM]);

  return (
    <div className="bg-surface-canvas min-h-dvh py-10">
      <main>
        <div
          id="search-bar"
          className="mb-10 flex justify-center gap-4 px-4 sm:px-6 md:flex-row md:items-center"
        >
          <div className="w-full md:w-3/4 lg:w-3/5">
            <Search
              progressState={searchProgress}
              query={searchQuery}
              onSearch={(query) => applyDataControls({ nextDataControls: { search: query } })}
            />
          </div>
        </div>
        <div className="max-w-screen-3xl flex flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:px-8">
          {/* Sidebar */}
          <aside className="w-full rounded-lg lg:w-1/4 lg:max-w-72" aria-label="Filters">
            <SideBar
              filters={filters}
              changedSince={changedSince}
              onChangedSinceChange={(value) =>
                applyDataControls({ nextDataControls: { changedSince: value, pageNumber: 1 } })
              }
              onFilterCheck={toggleFilter}
              resetFilters={resetDataControls}
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
              buttonOnclick={() => applyDataControls({ nextDataControls: {} })}
            />
          ) : (
            <section className="w-full flex-1 lg:w-3/4">
              <div className="text-text-primary mb-4 flex flex-wrap items-center justify-between gap-4">
                {isInventoryLoading ? (
                  <p>Loading...</p>
                ) : (
                  <p className="text-lg">
                    Showing{' '}
                    {Object.keys(checkedFilterOptions).length === 0 &&
                    !changedSince &&
                    !searchQuery.trim() ? (
                      <>
                        all <span className="text-interactive-primary">{totalInventoryCount}</span>{' '}
                        TMs
                      </>
                    ) : (
                      <>
                        <span className="text-(--color-icon-brand)">
                          {totalFilteredInventoryCount}
                        </span>{' '}
                        matching TM{totalFilteredInventoryCount !== 1 ? 's' : ''} from{' '}
                        {totalInventoryCount}
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
                        setLocalStorage(INVENTORY_PAGE_SIZE_KEY, value);
                        await applyDataControls({ nextDataControls: { pageSize: Number(value) } });
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
                      aria-pressed={inventoryView === 'grid'}
                      variant={inventoryView === 'grid' ? 'solid' : 'plain'}
                      onClick={() => setInventoryView('grid')}
                      className="size-6 justify-center p-0!"
                    >
                      <Squares2X2Icon className="size-5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      aria-label="List view"
                      title="List view"
                      aria-pressed={inventoryView === 'list'}
                      variant={inventoryView === 'list' ? 'solid' : 'plain'}
                      onClick={() => setInventoryView('list')}
                      className="size-6 justify-center p-0!"
                    >
                      <ListBulletIcon className="size-5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <InventoryResults
                  items={process.env.TMC_SERVER_URL ? filteredInventoryPage : paginatedItems}
                  loading={isInventoryLoading}
                  view={inventoryView}
                />
                <Pagination
                  page={pageNumber}
                  totalPages={totalPages}
                  onPageChange={async (newPage) => {
                    await applyDataControls({ nextDataControls: { pageNumber: newPage } });
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
