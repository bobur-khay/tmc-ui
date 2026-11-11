'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid';

interface FilterProps {
  label: string;
  hint: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Filter({ label, hint, children, defaultOpen = true }: FilterProps) {
  const hintId = useId();
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideHint = () => {
    if (hintTimer.current !== null) {
      clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
    setShowHint(false);
  };

  const scheduleHint = () => {
    hideHint();
    hintTimer.current = setTimeout(() => {
      setShowHint(true);
      hintTimer.current = null;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (hintTimer.current !== null) clearTimeout(hintTimer.current);
    };
  }, []);

  return (
    <Disclosure as="div" defaultOpen={defaultOpen} className="py-3">
      <div className="relative">
        <h3 className="flow-root">
          <DisclosureButton
            className="group bg-surface-canvas hover:bg-surface-input-hover -ml-1 flex w-[calc(100%+8px)] cursor-pointer items-center justify-between px-1 py-2 text-sm"
            aria-describedby={showHint ? hintId : undefined}
            onMouseEnter={scheduleHint}
            onMouseLeave={hideHint}
            onFocus={scheduleHint}
            onBlur={hideHint}
            onClick={hideHint}
            onKeyDown={(event) => {
              if (event.key === 'Escape') hideHint();
            }}
          >
            <span className="text-text-secondary font-medium">{label}</span>
            <span className="ml-6 flex shrink-0 items-center">
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
        </h3>
        {showHint && (
          <span
            id={hintId}
            role="tooltip"
            className="bg-surface-modal border-border-subtle text-text-primary absolute top-full left-0 z-50 -ml-1 block w-[calc(100%+8px)] border p-3 text-sm font-normal shadow-lg"
          >
            {hint}
          </span>
        )}
      </div>
      <DisclosurePanel className="bg-surface-canvas pt-2">{children}</DisclosurePanel>
    </Disclosure>
  );
}
