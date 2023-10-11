/* eslint-disable no-throw-literal */
import { getValueOrComputedValue } from '.';

const encodeParams = (params: Record<string, string | number | boolean>) =>
  Object.entries(params)
    .map((kv) => kv.map(encodeURIComponent).join('='))
    .join('&');

type FetcherOptions<TResponse = any> = {
  url: string;
  query?: string;
  params?: Record<string, string | number | boolean> | null;
  payload?: any;
  validate?: (response: TResponse) => void | Promise<void>;
} & RequestInit;

/**
 * Experimental fetcher - a query/mutation function creator.
 *
 * Can be used for REST or GraphQL.
 *
 * @returns A function to fetch data
 */
export const fetcher =
  <TResponse = any, TInput extends any[] = any[]>(
    options: FetcherOptions<TResponse> | ((...args: TInput) => FetcherOptions<TResponse>),
  ) =>
  async (...args: TInput) => {
    const { url, query, params, payload, headers, validate, ...rest } = getValueOrComputedValue(
      options,
      ...args,
    );

    let autoOptions: RequestInit = {};
    let searchParams = params;

    if (query) {
      // GraphQL
      autoOptions = {
        method: 'POST',
        body: JSON.stringify({ query, variables: payload || args[0] }),
      };
    } else if (rest.method && rest.method.toLowerCase() !== 'get') {
      // REST - Mutation
      autoOptions = {
        body: JSON.stringify(payload === undefined ? args[0] : payload),
      };
    } else {
      // REST - Query
      if (typeof options === 'object' && params === undefined) searchParams = args[0];
    }

    const fetchUrl = searchParams ? [url, encodeParams(searchParams)].join('?') : url;

    const res = await fetch(fetchUrl, {
      headers: { 'Content-Type': 'application/json', ...headers },
      ...autoOptions,
      ...rest,
    });

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const resJson = await res.json().catch(() => undefined);
      if (resJson !== undefined) {
        if (query && resJson.errors) {
          throw { status: res.status, statusText: res.statusText, response: resJson };
        }
        if (res.ok) {
          if (validate) {
            try {
              await validate(resJson);
            } catch (err) {
              throw {
                status: res.status,
                statusText: res.statusText,
                response: resJson,
                validationError: err,
              };
            }
          }
          return resJson as TResponse;
        }
        throw { status: res.status, statusText: res.statusText, response: resJson };
      }
    }

    const resText = await res.text().catch(() => undefined);
    throw { status: res.status, statusText: res.statusText, response: resText };
  };
