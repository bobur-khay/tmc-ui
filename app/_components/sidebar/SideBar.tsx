import React, { memo, useState, useEffect, useRef } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { MinusIcon, PlusIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import Button from '../base/Button';
import { capitalize } from '@/lib/utils/strings';
import type { FilterKey, Filters } from '../data-controls/types';
import { FilterOptions } from '../filters/FilterOptions';

const filterDescriptions: Record<FilterKey, string> = {
  author: 'The person or organization that created the Thing Model',
  manufacturer: 'The manufacturer of the device described by the Thing Model',
  protocol: 'The communication protocol used to interact with the device',
  repository:
    'The catalog repository that contains the Thing Model (e.g., GitHub, GitLab or S3 repo name)',
};

interface SideBarProps {
  filters: Filters;
  onFilterCheck: (filterKey: FilterKey, optionValue: string) => void;
  resetFilters: () => void;
}

export const SideBar = memo(function SideBar({
  filters,
  onFilterCheck,
  resetFilters,
}: SideBarProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [descriptionKey, setDescriptionKey] = useState<FilterKey | null>(null);
  const descriptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hideDescription = () => {
    if (descriptionTimer.current !== null) {
      clearTimeout(descriptionTimer.current);
      descriptionTimer.current = null;
    }
    setDescriptionKey(null);
  };

  const scheduleDescription = (key: FilterKey) => {
    hideDescription();
    descriptionTimer.current = setTimeout(() => {
      setDescriptionKey(key);
      descriptionTimer.current = null;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (descriptionTimer.current !== null) clearTimeout(descriptionTimer.current);
    };
  }, []);

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
          onClick={() => {
            formRef.current?.reset();
            resetFilters();
          }}
          variant="plain"
        />
      </div>

      <section aria-labelledby="products-heading" className="pb-15">
        <div className="flex flex-col gap-x-8 gap-y-10">
          {/* Filters */}
          <form ref={formRef} className="lg:block">
            {Object.entries(filters)
              .filter(
                ([key, options]) =>
                  key !== 'repository' || !Array.isArray(options) || options.length !== 1,
              )
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
              .map(([key, options]) => (
                <Disclosure key={key} as="div" defaultOpen className="py-3">
                  <h3 className="relative flow-root">
                    <DisclosureButton
                      className="group bg-surface-canvas hover:bg-surface-input-hover -ml-1 flex w-[calc(100%+8px)] cursor-pointer items-center justify-between px-1 py-2 text-sm"
                      aria-describedby={
                        descriptionKey === key ? `filter-description-${key}` : undefined
                      }
                      onMouseEnter={() => scheduleDescription(key as FilterKey)}
                      onMouseLeave={hideDescription}
                      onFocus={() => scheduleDescription(key as FilterKey)}
                      onBlur={hideDescription}
                      onClick={hideDescription}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') hideDescription();
                      }}
                    >
                      <span className="text-text-secondary font-medium">{capitalize(key)}</span>
                      <span className="ml-6 flex items-center">
                        <PlusIcon
                          aria-hidden="true"
                          className="text-icon-brand group-hover:text-interactive-hover size-5 group-data-open:hidden"
                        />
                        <MinusIcon
                          aria-hidden="true"
                          className="text-icon-brand group-hover:text-interactive-hover hidden size-5 group-data-open:block"
                        />
                      </span>
                    </DisclosureButton>
                    {descriptionKey === key && (
                      <span
                        id={`filter-description-${key}`}
                        role="tooltip"
                        className="bg-surface-modal border-border-subtle text-text-primary absolute top-full left-0 z-50 -ml-1 block w-[calc(100%+8px)] border p-3 text-sm font-normal shadow-lg"
                      >
                        {filterDescriptions[descriptionKey]}
                      </span>
                    )}
                  </h3>
                  <DisclosurePanel className="bg-surface-canvas pt-2">
                    <FilterOptions
                      sectionId={key as FilterKey}
                      options={options}
                      onOptionChange={onFilterCheck}
                    />
                  </DisclosurePanel>
                </Disclosure>
              ))}
          </form>

          {showScrollTop && (
            <div className="fixed bottom-4 left-4 z-50">
              <Button
                type="button"
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className="border whitespace-nowrap"
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
});
