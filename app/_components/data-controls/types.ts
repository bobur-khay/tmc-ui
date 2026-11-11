export const allFilterKeys = [
  'repository',
  'manufacturer',
  'author',
  'protocol',
  'changedSince',
] as const;
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
  changedSince: { message: 'Loading...' },
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

export interface DataControls {
  filters: Filters;
  changedSince: string;
  search: string;
  pageNumber: number;
  pageSize: number;
}
export type NextDataControls = Partial<DataControls>;
export type DataControlType = keyof DataControls;

export type ApplyDataControlsParams = {
  nextDataControls: NextDataControls;
};
