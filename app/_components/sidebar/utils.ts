import { fetchDataFromTxT, fetchLocalDataInventory } from '@/lib/services/localData';
import {
  AUTHOR_ENDPOINT,
  MANUFACTURER_ENDPOINT,
  REPOSITORY_ENDPOINT,
  PROTOCOLS,
  PROTOCOLS_FILENAME,
} from '@/lib/utils/constants';
import type {
  Filters,
  FilterKey,
  FilterOptionParam,
  FilterData,
  FilterOptionsFetchFunctionParams,
} from '../data-controls/types';

export async function getAvailableFilterOptionsClient(signal?: AbortSignal): Promise<Filters> {
  const unavailable = { message: 'No filter data available' };
  const filterOptionsResult: Filters = {
    author: unavailable,
    manufacturer: unavailable,
    repository: unavailable,
    protocol: unavailable,
  };
  try {
    const inventory = await fetchLocalDataInventory(signal);
    const values = {
      author: inventory.map((item) => item['schema:author']?.['schema:name']),
      manufacturer: inventory.map((item) => item['schema:manufacturer']?.['schema:name']),
      repository: inventory.map((item) => item.repo),
    };
    for (const key of ['author', 'manufacturer', 'repository'] as const) {
      const distinctValues =
        key === 'repository'
          ? [...new Set(values[key].filter(Boolean))]
          : getDistinctFilterValues(values[key].filter(Boolean));
      const options: FilterData[] = distinctValues
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, checked: false }));
      filterOptionsResult[key] = options.length ? options : unavailable;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error(error instanceof Error ? error.message : error);
    for (const key of ['author', 'manufacturer', 'repository'] as const) {
      filterOptionsResult[key] = {
        message: 'Could not fetch the filters. Refresh the page to try again.',
      };
    }
  }

  try {
    const protocols = await fetchDataFromTxT(window.location.origin, PROTOCOLS_FILENAME, signal);
    const options = getDistinctFilterValues(protocols)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, checked: false }));
    filterOptionsResult.protocol = options.length ? options : unavailable;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error(error instanceof Error ? error.message : error);
    filterOptionsResult.protocol = {
      message: 'Could not fetch the filters. Refresh the page to try again.',
    };
  }

  return filterOptionsResult;
}

export async function getAvailableFilterOptionsServer(
  authorizationHeader: string,
  signal?: AbortSignal,
): Promise<Filters> {
  const headers = {
    Authorization: authorizationHeader,
  };

  const filterOptionParams: Record<FilterKey, FilterOptionParam> = {
    author: {
      endpoint: AUTHOR_ENDPOINT,
      transform: (json: any) => (json as { data?: string[] } | null)?.data ?? [],
    },
    manufacturer: {
      endpoint: MANUFACTURER_ENDPOINT,
      transform: (json: any) => (json as { data?: string[] } | null)?.data ?? [],
    },
    repository: {
      endpoint: REPOSITORY_ENDPOINT,
      transform: (json: any) =>
        ((json as { data?: { name: string }[] } | null)?.data ?? []).map(({ name }) => name),
    },
    protocol: {
      skip: true,
    },
  };

  const fetchFunction = async ({ endpoint, transform }: FilterOptionsFetchFunctionParams) => {
    return await fetchAvailableFilterOptionsServer({ endpoint, transform, signal, headers });
  };

  const filterOptionResults = await getFilterOptionsResults(filterOptionParams, fetchFunction);
  // Manual fetch for skipped filters here:
  filterOptionResults.protocol = PROTOCOLS;

  return filterOptionResults;
}

function getDistinctFilterValues(values: string[]): string[] {
  const distinctValues = new Map<string, string>();
  for (const value of values) {
    const normalizedValue = value.toLowerCase();
    const existingValue = distinctValues.get(normalizedValue);
    if (
      existingValue === undefined ||
      (existingValue === existingValue.toLowerCase() && value !== normalizedValue)
    ) {
      distinctValues.set(normalizedValue, value);
    }
  }
  return [...distinctValues.values()];
}

async function getFilterOptionsResults(
  filterOptionParams: Record<FilterKey, FilterOptionParam>,
  fetchFunction: ({ endpoint, transform }: FilterOptionsFetchFunctionParams) => Promise<string[]>,
): Promise<Filters> {
  const filterOptionResults = {} as Filters;

  await Promise.all(
    Object.entries(filterOptionParams).map(async ([filterKey, value]): Promise<void> => {
      if ('skip' in value) {
        return;
      }
      const typedKey = filterKey as FilterKey;
      try {
        const apiResponse = await fetchFunction({
          endpoint: value.endpoint,
          transform: value.transform,
        });
        if (apiResponse.length === 0) {
          filterOptionResults[typedKey] = {
            message: `No filter data available`,
          };
        } else {
          filterOptionResults[typedKey] = getDistinctFilterValues(apiResponse).map((value) => ({
            value,
            checked: false,
          }));
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        filterOptionResults[typedKey] = {
          message: 'Could not fetch the filters. Refresh the page to try again.',
        };
      }
    }),
  );
  return filterOptionResults;
}

export async function fetchAvailableFilterOptionsServer({
  endpoint,
  headers,
  signal,
  transform,
}: {
  endpoint: string;
  transform?: (json: unknown) => string[];
  headers?: HeadersInit;
  signal?: AbortSignal;
}): Promise<string[]> {
  try {
    const apiResponse = await fetch(`${process.env.API_BASE}/${endpoint}`, {
      headers,
      signal,
    });
    if (!apiResponse.ok) {
      throw new Error(await apiResponse.text());
    }
    const result = transform ? transform(await apiResponse.json()) : await apiResponse.json();
    return result;
  } catch (error) {
    if (signal?.aborted) return [];
    throw error;
  }
}

export function normalizeAuthor(raw: string): string {
  const firstSegment = raw.split('/')[0]?.trim() ?? '';
  if (!firstSegment) return '';
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}
