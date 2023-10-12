/* eslint-disable no-throw-literal */
import { getValueOrComputedValue, identityFn } from '.';

const encodeParams = (params: Record<string, string | number | boolean>) =>
  Object.entries(params)
    .map((kv) => kv.map(encodeURIComponent).join('='))
    .join('&');

type FetcherOptions<TResponse = any> = {
  url: string;
  query?: string;
  params?: Record<string, string | number | boolean> | null;
  payload?: any;
  interceptRequest?: (
    requestOptions: RequestInit & { url: string },
  ) => (RequestInit & { url: string }) | Promise<RequestInit & { url: string }>;
  interceptResponse?: (response: TResponse) => TResponse | Promise<TResponse>;
} & RequestInit;

/**
 * Experimental fetcher - abstraction layer for query/mutation function creator.
 *
 * Can be used for REST or GraphQL.
 *
 * @see https://floppy-disk.vercel.app/docs/experimental
 *
 * @returns A function to fetch data
 */
export const fetcher =
  <TResponse = any, TInput extends any[] = any[]>(
    options: FetcherOptions<TResponse> | ((...args: TInput) => FetcherOptions<TResponse>),
  ) =>
  async (...args: TInput) => {
    const {
      url,
      query,
      params,
      payload,
      headers,
      interceptRequest = identityFn,
      interceptResponse,
      ...rest
    } = getValueOrComputedValue(options, ...args);

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

    const interceptedOptions = await interceptRequest({
      url: searchParams ? [url, encodeParams(searchParams)].join('?') : url,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...autoOptions,
      ...rest,
    });

    const { url: finalUrl, ...finalOptions } = interceptedOptions;
    const res = await fetch(finalUrl, finalOptions);

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      let resJson = await res.json();
      if (query) {
        if (resJson.errors) {
          throw { status: res.status, statusText: res.statusText, response: resJson };
        }
        resJson = resJson.data;
      }
      if (res.ok) {
        if (interceptResponse) {
          try {
            const finalResponse = await interceptResponse(resJson);
            return finalResponse;
          } catch (error) {
            throw {
              status: res.status,
              statusText: res.statusText,
              response: resJson,
              error,
            };
          }
        }
        return resJson as TResponse;
      }
      throw { status: res.status, statusText: res.statusText, response: resJson };
    }

    const resText = await res.text().catch(() => undefined);
    throw { status: res.status, statusText: res.statusText, response: resText };
  };
