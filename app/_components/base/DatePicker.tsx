'use client';
import React, { useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface DatePickerProps {
  id?: string;
  /** Date in YYYY-MM-DD format, or empty string. */
  value: string;
  /** Latest selectable date in YYYY-MM-DD format. */
  max?: string;
  onChange: (value: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

const getInitialMonth = (value: string, max?: string) => {
  const source = value || max;
  if (source) {
    const [year, month] = source.split('-').map(Number);
    return { year, month: month - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const DatePicker: React.FC<DatePickerProps> = ({ id, value, max, onChange }) => {
  const [view, setView] = useState(() => getInitialMonth(value, max));

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const isNextMonthDisabled = !!max && toIsoDate(view.year, view.month + 1, 1) > max;

  const shiftMonth = (delta: number) => {
    setView(({ year, month }) => {
      const date = new Date(year, month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  return (
    <Popover className="relative w-full">
      <PopoverButton
        id={id}
        className="bg-surface-input text-text-primary hover:border-border-interactive-hover hover:bg-surface-input-hover focus-visible:border-border-interactive-hover flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 font-mono text-sm outline-none"
        onClick={() => setView(getInitialMonth(value, max))}
      >
        <span className={value ? '' : 'text-text-tertiary'}>{value || 'yyyy-mm-dd'}</span>
        <CalendarIcon className="text-icon-brand size-5" aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        className="bg-surface-canvas z-30 mt-2 w-72 rounded-md p-3 shadow-lg"
      >
        {({ close }) => (
          <>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                className="text-interactive-primary hover:bg-surface-input-hover rounded p-1"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeftIcon className="size-5" aria-hidden="true" />
              </button>
              <span className="text-text-primary text-sm font-medium">{monthLabel}</span>
              <button
                type="button"
                aria-label="Next month"
                className="text-interactive-primary hover:bg-surface-input-hover rounded p-1 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
                disabled={isNextMonthDisabled}
                onClick={() => shiftMonth(1)}
              >
                <ChevronRightIcon className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-text-tertiary py-1">
                  {day}
                </span>
              ))}
              {Array.from({ length: firstWeekday }, (_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const iso = toIsoDate(view.year, view.month, day);
                const isDisabled = !!max && iso > max;
                const isSelected = iso === value;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={[
                      'rounded py-1.5 text-sm',
                      isSelected
                        ? 'bg-interactive-primary text-text-inverse-strong'
                        : 'text-text-primary hover:bg-surface-input-hover',
                      'disabled:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
                    ].join(' ')}
                    onClick={() => {
                      onChange(iso);
                      close();
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {value && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-interactive-primary hover:bg-surface-input-hover rounded px-2 py-1 text-xs"
                  onClick={() => {
                    onChange('');
                    close();
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
};

export default DatePicker;
