import {
  ArrowPathIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import { useRef } from 'react';
import Input from '../base/Input';

export type SearchProgress = 0 | 80 | 100;

interface SearchProps {
  query: string;
  progressState: SearchProgress;
  onSearch: (query: string) => void;
}

const TO_EIGHTY_DURATION_MS = 3000;
export const TO_HUNDRED_DURATION_MS = 200;
export const FADE_OUT_DURATION_MS = 200;

const progressToDurationMap: Record<SearchProgress, number> = {
  0: 0,
  80: TO_EIGHTY_DURATION_MS,
  100: TO_HUNDRED_DURATION_MS,
};

export function Search({ query, progressState, onSearch }: SearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loading = progressState > 0 && progressState < 100;

  return (
    <>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          autoFocus
          value={query}
          className="h-12 pr-10 pl-11 text-base sm:text-sm"
          placeholder="Search..."
          onChange={async (e) => {
            onSearch(e.target.value);
          }}
          aria-label="Search inventory"
        />
        {loading ? (
          <div className="text-text-secondary pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2">
            <span aria-hidden="true">
              <ArrowPathIcon className="text-text-secondary size-5 animate-spin" />
            </span>
          </div>
        ) : (
          <MagnifyingGlassIcon
            className="text-text-secondary pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
            aria-hidden="true"
          />
        )}

        {!query && (
          <div className="group absolute top-1/2 right-2 -translate-y-1/2">
            <button
              type="button"
              aria-label="Search information"
              aria-describedby="search-scope-description"
              className="text-text-secondary hover:text-text-primary focus-visible:outline-focus-ring rounded p-1 focus-visible:outline-2"
            >
              <InformationCircleIcon className="size-5" aria-hidden="true" />
            </button>
            <span
              id="search-scope-description"
              role="tooltip"
              className="bg-surface-modal border-border-subtle text-text-primary invisible absolute top-full right-0 z-50 mt-2 block w-72 max-w-[calc(100vw-2rem)] rounded-md border p-3 text-sm shadow-lg group-focus-within:visible group-hover:visible"
            >
              Search matches the titles and descriptions of Thing Models
            </span>
          </div>
        )}

        {query && !loading && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onSearch('');
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="text-interactive-support hover:bg-interactive-support hover:text-text-primary absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div
        className="border-text-primary bg-surface-canvas h-1.5 w-full overflow-hidden rounded-b-full border"
        style={{
          opacity: loading ? 1 : 0,
          transition: 'opacity linear',
          transitionDuration: FADE_OUT_DURATION_MS + 'ms',
        }}
      >
        <div
          className="bg-status-success h-full rounded-b-full"
          style={{
            transition: `width 3s linear`,
            transitionDuration: progressToDurationMap[progressState] + 'ms',
            width: progressState + '%',
          }}
        />
      </div>
    </>
  );
}
