import type { SearchProgress } from '@/app/_components/data-controls/Search';
import {
  TO_HUNDRED_DURATION_MS,
  FADE_OUT_DURATION_MS,
} from '@/app/_components/data-controls/Search';
import { useState, useRef, useEffect } from 'react';

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProgress, setSearchProgress] = useState<SearchProgress>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (searchProgress === 100) {
      timeoutRef.current = setTimeout(
        () => setSearchProgress(0),
        TO_HUNDRED_DURATION_MS + FADE_OUT_DURATION_MS,
      );
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchProgress]);
  return { searchQuery, setSearchQuery, searchProgress, setSearchProgress };
}
