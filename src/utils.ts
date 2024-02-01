export type Maybe<T> = T | null | undefined;

/**
 * Check if this runs on browser.
 */
export const isClient = typeof window !== 'undefined' && !('Deno' in window);

export const noop = () => {};

export const identityFn = <T>(value: T) => value;

/**
 * Check if a value is not undefined and not null.
 *
 * ```ts
 * const hasValue = (value: any) => value !== undefined && value !== null;
 * ```
 */
export const hasValue = (value: any) => value !== undefined && value !== null;

/**
 * If the value is a function, it will invoke the function.\
 * If the value is not a function, it will just return it.
 */
export const getValue = <T, P extends any[]>(
  valueOrComputeValueFn: T | ((...params: P) => T),
  ...params: P
) => {
  if (typeof valueOrComputeValueFn === 'function') {
    return (valueOrComputeValueFn as (...params: P) => T)(...params);
  }
  return valueOrComputeValueFn;
};

/**
 * Create an Error instance with custom props.
 */
export const createError = (message: string, props: Record<string, any>) => {
  const error = Object.assign(new Error(message), props);
  return error;
};
