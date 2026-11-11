import React, { memo, useState, useEffect, useRef } from 'react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import Button from '../base/Button';
import Input from '../base/Input';
import { capitalize } from '@/lib/utils/strings';
import type { FilterKey, Filters } from '../data-controls/types';
import { Filter } from '../filters/Filter';
import { FilterOptions } from '../filters/FilterOptions';

const filterDescriptions: Record<FilterKey, string> = {
  author: 'The person or organization that created the Thing Model',
  manufacturer: 'The manufacturer of the device described by the Thing Model',
  protocol: 'The communication protocol used to interact with the device',
  repository:
    'The catalog repository that contains the Thing Model (e.g., GitHub, GitLab or S3 repo name)',
  changedSince: 'The date since when the Thing Model has been changed',
};

interface SideBarProps {
  filters: Filters;
  changedSince: string;
  onChangedSinceChange: (value: string) => void;
  onFilterCheck: (filterKey: FilterKey, optionValue: string) => void;
  resetFilters: () => void;
}

export const SideBar = memo(function SideBar({
  filters,
  changedSince,
  onChangedSinceChange,
  onFilterCheck,
  resetFilters,
}: SideBarProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [changedSinceDraft, setChangedSinceDraft] = useState(changedSince);
  const formRef = useRef<HTMLFormElement>(null);

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
            setChangedSinceDraft('');
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
                <Filter
                  key={key}
                  label={capitalize(key)}
                  hint={filterDescriptions[key as FilterKey]}
                >
                  <FilterOptions
                    sectionId={key as FilterKey}
                    options={options}
                    onOptionChange={onFilterCheck}
                  />
                </Filter>
              ))}
            <Filter label="Changed Since" hint={filterDescriptions.changedSince}>
              <Input
                id="filter-changed-since"
                type="date"
                value={changedSinceDraft}
                onChange={(event) => setChangedSinceDraft(event.target.value)}
              />
              <Button
                type="button"
                text="Apply"
                onClick={() => onChangedSinceChange(changedSinceDraft)}
                disabled={changedSinceDraft === changedSince}
                className="mt-3 w-full justify-center border"
                variant="outlined"
              />
            </Filter>
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
