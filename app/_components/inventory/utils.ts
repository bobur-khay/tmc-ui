import {
  AUTHOR_ENDPOINT,
  AUTHORS_FILENAME,
  MANUFACTURER_ENDPOINT,
  MANUFACTURERS_FILENAME,
  PROTOCOLS,
  REPOSITORY_ENDPOINT,
} from '@/lib/utils/constants';
import type {
  FetchFailure,
  FilterData,
  FilterKey,
  FilterOptionParam,
  FilterOptionsFetchFunctionParams,
  Filters,
  ServerResponseError,
  SettledFetchResult,
} from './types';
import { fetchDataFromTxT } from '@/lib/services/localData';
import { capitalize } from '@/lib/utils/strings';

export async function getAvailableFilterOptionsClient(): Promise<Filters> {
  const filterOptionParams: Record<FilterKey, FilterOptionParam> = {
    author: {
      endpoint: AUTHORS_FILENAME,
      transform: (res: FilterData[]) =>
        Array.from(new Set(res.map((author) => normalizeAuthor(author.value)).filter(Boolean))).map(
          (name) => ({
            value: name,
            label: name,
            checked: false,
          }),
        ),
    },
    manufacturer: {
      endpoint: MANUFACTURERS_FILENAME,
    },
    repository: {
      skip: true,
    },
    protocol: {
      skip: true,
    },
  };

  const fetchFunction = async ({ transform, endpoint }: FilterOptionsFetchFunctionParams) => {
    const res = await fetchDataFromTxT(window.location.origin, endpoint);
    return transform ? transform(res) : res;
  };
  const filterOptionsResult = await getFilterOptionsResults(filterOptionParams, fetchFunction);

  // Manual fetch for skipped filters here:
  filterOptionsResult.repository = [];
  // TODO: protocols

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
      transform: (json: any) =>
        ((json as { data?: string[] } | null)?.data ?? []).map((value) => ({
          value,
          label: capitalize(value),
          checked: false,
        })),
    },
    manufacturer: {
      endpoint: MANUFACTURER_ENDPOINT,
      transform: (json: any) =>
        ((json as { data?: string[] } | null)?.data ?? []).map((value) => ({
          value,
          label: capitalize(value),
          checked: false,
        })),
    },
    repository: {
      endpoint: REPOSITORY_ENDPOINT,
      transform: (json: any) =>
        ((json as { data?: { name: string }[] } | null)?.data ?? []).map(({ name }) => ({
          value: name,
          label: capitalize(name),
          checked: false,
        })),
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
  // TODO
  filterOptionResults.protocol = PROTOCOLS;

  return filterOptionResults;
}

async function getFilterOptionsResults(
  filterOptionParams: Record<FilterKey, FilterOptionParam>,
  fetchFunction: ({
    endpoint,
    transform,
  }: FilterOptionsFetchFunctionParams) => Promise<FilterData[]>,
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
            errorMessage: `No filter data available`,
          };
        } else {
          filterOptionResults[typedKey] = apiResponse;
        }
      } catch (err) {
        filterOptionResults[typedKey] = {
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
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
  transform?: (json: unknown) => FilterData[];
  headers?: HeadersInit;
  signal?: AbortSignal;
}): Promise<FilterData[]> {
  try {
    const apiResponse = await fetch(`${process.env.API_BASE}/${endpoint}`, {
      headers,
      signal,
    });
    if (!apiResponse.ok) {
      throw new Error(`${endpoint}: HTTP ${apiResponse.status}`);
    }
    return transform ? transform(apiResponse.json()) : apiResponse.json();
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

export async function parseFailedResponse(
  response: Response,
  fallbackInstance: string,
): Promise<FetchFailure> {
  let instance = fallbackInstance;
  let detail = response.statusText || 'Request failed';

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await response.json().catch(() => null)) as ServerResponseError | null;

    instance = body?.instance ?? fallbackInstance;
    detail = body?.detail ?? body?.title ?? body?.code ?? detail;
  } else {
    const text = await response.text().catch(() => '');
    if (text.trim()) {
      detail = text.trim();
    }
  }
  return {
    instance,
    status: response.status,
    detail,
  };
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function parseRejectedFetchFailure(reason: unknown, fallbackInstance: string): FetchFailure {
  return {
    instance: fallbackInstance,
    status: 0,
    detail: reason instanceof Error ? reason.message : 'Request failed before receiving a response',
  };
}

export async function resolveSettledFetch<T>(
  result: PromiseSettledResult<Response>,
  fallbackInstance: string,
  mapResponse: (json: unknown) => T,
  fallbackData: T,
): Promise<SettledFetchResult<T>> {
  if (result.status === 'rejected') {
    if (isAbortError(result.reason)) {
      throw result.reason;
    }

    return {
      data: fallbackData,
      failure: parseRejectedFetchFailure(result.reason, fallbackInstance),
    };
  }

  if (!result.value.ok) {
    return {
      data: fallbackData,
      failure: await parseFailedResponse(result.value, fallbackInstance),
    };
  }

  const json = await result.value.json().catch((reason: unknown) => {
    throw parseRejectedFetchFailure(reason, fallbackInstance);
  });

  return {
    data: mapResponse(json),
    failure: null,
  };
}
