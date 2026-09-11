import React, { useMemo, useState, useEffect } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { MinusIcon, PlusIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import FilterOptions from './FilterOptions';
import Button from './base/Button';

interface SideBarProps {
  manufacturersState: Array<FilterData>;
  authorsState: Array<FilterData>;
  repositoriesState: Array<FilterData>;
  protocolsState: Array<FilterData>;
  onFilterChange: (sectionId: string, optionValue: string, checked: boolean) => void;
  onAddProtocol?: (protocol: FilterData) => void;
  resetFilters: () => void;
}

const SideBar: React.FC<SideBarProps> = ({
  manufacturersState,
  authorsState,
  repositoriesState,
  protocolsState,
  onFilterChange,
  onAddProtocol,
  resetFilters,
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filters = useMemo<Filters>(() => {
    const baseFilters: Filters = [
      { id: 'protocol', name: 'Protocol', options: protocolsState },
      { id: 'manufacturer', name: 'Manufacturer', options: manufacturersState },
      { id: 'author', name: 'Author', options: authorsState },
      { id: 'repository', name: 'Repository', options: repositoriesState },
    ];

    if (!__SERVER_AVAILABLE__) {
      return baseFilters.filter((filter) => filter.id !== 'repository');
    }

    return baseFilters;
  }, [protocolsState, manufacturersState, authorsState, repositoriesState]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(
        (window.innerWidth > 1024 && window.scrollY > 1000) ||
          (window.innerWidth <= 1024 && window.scrollY > 2000),
      );
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between pb-4">
        <h1 className="text-text-primary text-3xl font-bold tracking-tight">Filters</h1>
        <Button
          text="Reset filters"
          className="rounded px-2"
          onClick={resetFilters}
          variant="default"
        />
      </div>

      <section aria-labelledby="products-heading" className="pb-15">
        <div className="flex flex-col gap-x-8 gap-y-10">
          {/* Filters */}
          <form className="lg:block">
            {filters.map((section) => (
              <Disclosure key={section.id} as="div" className="border-border-subtle border-b py-5">
                <h3 className="flow-root">
                  <DisclosureButton className="group bg-surface-canvas flex w-full items-center justify-between py-3 text-sm">
                    <span className="text-text-secondary font-medium">{section.name}</span>
                    <span className="ml-6 flex items-center">
                      <PlusIcon
                        aria-hidden="true"
                        className="text-icon-brand group-hover:text-interactive-hover size-5 group-data-[open]:hidden"
                      />
                      <MinusIcon
                        aria-hidden="true"
                        className="text-icon-brand group-hover:text-interactive-hover hidden size-5 group-data-[open]:block"
                      />
                    </span>
                  </DisclosureButton>
                </h3>
                <DisclosurePanel className="bg-surface-canvas pt-3">
                  {section.id === 'protocol' && !__SERVER_AVAILABLE__ ? (
                    <p className="text-text-primary mb-4 text-sm">
                      Protocol filtering is only available when connected to a backend server.
                    </p>
                  ) : (
                    <FilterOptions
                      sectionId={section.id}
                      options={section.options}
                      onOptionChange={onFilterChange}
                      onAddProtocol={onAddProtocol}
                    />
                  )}
                </DisclosurePanel>
              </Disclosure>
            ))}
          </form>

          {/* Product grid */}
          {showScrollTop && (
            <div className="fixed right-4 bottom-4 z-50">
              <Button
                type="button"
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className="border whitespace-nowrap"
                variant="default"
              >
                <span className="inline-flex items-center gap-2 p-2">
                  <ChevronUpIcon className="size-6" aria-hidden="true" />
                  <span>Back to top</span>
                </span>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SideBar;
