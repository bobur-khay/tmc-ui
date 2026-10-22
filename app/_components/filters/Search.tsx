import { ArrowPathIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useEffect, useRef } from 'react';
import Input from '../base/Input';

export type SearchProgress = 0 | 80 | 100;

interface SearchProps {
  query: string;
  setQuery: (query: string) => void;
  progressState: SearchProgress;
  setProgressState: (progressState: SearchProgress) => void;
}

const TO_EIGHTY_DURATION_MS = 3000;
const TO_HUNDRED_DURATION_MS = 200;
const FADE_OUT_DURATION_MS = 200;

const progressToDurationMap: Record<SearchProgress, number> = {
  0: 0,
  80: TO_EIGHTY_DURATION_MS,
  100: TO_HUNDRED_DURATION_MS,
};

export function Search({ query, setQuery, progressState, setProgressState }: SearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loading = progressState > 0 && progressState < 100;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressState === 100) {
      timeoutRef.current = setTimeout(
        () => setProgressState(0),
        TO_HUNDRED_DURATION_MS + FADE_OUT_DURATION_MS,
      );
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [progressState, setProgressState]);

  return (
    <>
      <div className="relative overflow-hidden">
        <Input
          ref={inputRef}
          type="text"
          autoFocus
          value={query}
          className="h-12 pr-10 pl-11 text-base sm:text-sm"
          placeholder="Search..."
          onChange={async (e) => {
            setQuery(e.target.value);
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

        {query && !loading && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
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
