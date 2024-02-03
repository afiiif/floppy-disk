import { createError, getValue, identityFn } from '../utils';

const encodeParams = (params: Record<string, string | number | boolean>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
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
 * Only work for JSON response only.
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
    } = getValue(options, ...args);

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
    const isJsonFile = /\.json(\?.+)?$/.test(finalUrl);
    if (contentType?.includes('application/json') || isJsonFile) {
      let resJson = await res.json();
      if (query) {
        if (resJson.errors) {
          throw createError('Error GraphQL response', {
            status: res.status,
            statusText: res.statusText,
            response: resJson.errors,
            request: interceptedOptions,
          });
        }
        resJson = resJson.data;
      }
      if (res.ok) {
        if (interceptResponse) {
          try {
            const finalResponse = await interceptResponse(resJson);
            return finalResponse;
          } catch (error) {
            throw createError('Error intercept response', {
              status: res.status,
              statusText: res.statusText,
              response: resJson,
              error,
              request: interceptedOptions,
            });
          }
        }
        return resJson as TResponse;
      }
      throw createError('Fetch error', {
        status: res.status,
        statusText: res.statusText,
        response: resJson,
        request: interceptedOptions,
      });
    }

    const resText = await res.text().catch(() => undefined);
    throw createError('Response type is not a JSON', {
      status: res.status,
      statusText: res.statusText,
      response: resText,
      contentType,
      request: interceptedOptions,
    });
  };
