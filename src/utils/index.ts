export const noop = () => {};
export const identityFn = <T>(a: T) => a;

export const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort());
