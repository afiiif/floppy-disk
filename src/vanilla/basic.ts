/**
 * Check if this runs on browser.
 */
export const isClient = typeof window !== "undefined" && !("Deno" in window);

/**
 * Empty function.
 */
export const noop = () => {};

/**
 * If the value is a function, it will invoke the function.\
 * If the value is not a function, it will just return it.
 */
export const getValue = <T, P extends any[]>(
  valueOrComputeValueFn: T | ((...params: P) => T),
  ...params: P
) => {
  if (typeof valueOrComputeValueFn === "function") {
    return (valueOrComputeValueFn as (...params: P) => T)(...params);
  }
  return valueOrComputeValueFn;
};
