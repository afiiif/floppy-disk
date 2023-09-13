export const noop = () => {};
export const identityFn = <T>(value: T) => value;
export const hasValue = (value: any) => value !== undefined && value !== null;

export const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort());
