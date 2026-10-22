export const allFilterKeys = ['repository', 'manufacturer', 'author', 'protocol'] as const;
export type FilterKey = (typeof allFilterKeys)[number];

export type Filters = Record<FilterKey, FilterData[] | { message: string }>;
export type FilterData = {
  value: string;
  checked: boolean;
};
export const EMPTY_FILTERS: Filters = {
  author: { message: 'Loading...' },
  manufacturer: { message: 'Loading...' },
  protocol: { message: 'Loading...' },
  repository: { message: 'Loading...' },
};

export type CheckedFilterOptions = Record<FilterKey, string[]>;

export type FilterOptionParam =
  | FilterOptionsFetchFunctionParams
  | {
      skip: true;
    };

export interface FilterOptionsFetchFunctionParams {
  endpoint: string;
  transform?: (res: any) => string[];
}

export type ApplyFiltersParams = {
  isInitialLoad?: boolean;
  isReset?: boolean;
};
