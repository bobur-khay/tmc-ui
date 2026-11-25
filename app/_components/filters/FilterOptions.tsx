import type { FilterKey, FilterData } from '../data-controls/types';
import { formatRepositoryName } from '@/lib/utils/strings';

interface FilterOptionsProps {
  sectionId: FilterKey;
  options: readonly FilterData[] | { message: string };
  onOptionChange: (filterKey: FilterKey, optionValue: string) => void;
}

export function FilterOptions({ sectionId, options, onOptionChange }: FilterOptionsProps) {
  if ('message' in options)
    return <div className="text-text-primary text-sm">{options.message}</div>;

  const isRadio = sectionId === 'repository';

  const sortedOptions = [...options].sort(
    (optionA, optionB) =>
      (isRadio ? 0 : Number(optionB.checked) - Number(optionA.checked)) ||
      optionA.value.localeCompare(optionB.value),
  );

  return (
    <div
      role={isRadio ? 'radiogroup' : undefined}
      aria-label={`${sectionId} options`}
      className="max-h-40 overflow-y-scroll"
    >
      {sortedOptions.map((option, optionIdx) => (
        <div key={option.value} className="flex gap-3">
          <div className="flex h-5 shrink-0 items-center">
            <div className="group relative grid size-4 grid-cols-1">
              <input
                id={`filter-${sectionId}-${optionIdx}`}
                name={isRadio ? sectionId : `${sectionId}[]`}
                value={option.value}
                checked={option.checked}
                type={isRadio ? 'radio' : 'checkbox'}
                // Radios use onClick so clicking the selected one deselects it
                onChange={isRadio ? () => {} : () => onOptionChange(sectionId, option.value)}
                onClick={isRadio ? () => onOptionChange(sectionId, option.value) : undefined}
                className="peer col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded-xs focus-visible:outline-none disabled:cursor-not-allowed forced-colors:appearance-auto"
              />
              <span
                className={`border-focus-ring pointer-events-none absolute -top-0.5 -left-0.5 h-5 w-5 border opacity-0 peer-focus-visible:opacity-100 ${isRadio ? 'rounded-full' : 'rounded-sm'}`}
              />
              <svg
                fill="none"
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center"
              >
                <rect
                  x={isRadio ? 0.5 : 0}
                  y={isRadio ? 0.5 : 0}
                  width={isRadio ? 15 : 16}
                  height={isRadio ? 15 : 16}
                  rx={isRadio ? 7.5 : 2}
                  className="stroke-text-primary group-hover:fill-surface-input-hover group-hover:stroke-interactive-hover group-has-checked:fill-interactive-pressed group-has-disabled:fill-media group-has-checked:stroke-interactive-pressed group-has-disabled:stroke-text-marker fill-transparent"
                />
                {isRadio ? (
                  <circle
                    cx="8"
                    cy="8"
                    r="3.5"
                    className="fill-text-inverse-strong group-has-disabled:fill-text-tertiary opacity-0 group-has-checked:opacity-100"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.01428 9.85976L11.7739 2.73831L13.4367 3.84965L7.32081 13.0004L2.7594 8.42398L4.17593 7.01209L7.01428 9.85976Z"
                    className="fill-text-inverse-strong group-has-disabled:fill-text-tertiary opacity-0 group-has-checked:opacity-100"
                  />
                )}
              </svg>
            </div>
          </div>

          <label
            htmlFor={`filter-${sectionId}-${optionIdx}`}
            className="text-text-primary hover:text-text-secondary cursor-pointer text-sm"
          >
            {sectionId === 'repository' ? formatRepositoryName(option.value) : option.value}
          </label>
        </div>
      ))}
    </div>
  );
}
