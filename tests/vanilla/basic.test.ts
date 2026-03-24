import { describe, expect, it, vi } from 'vitest';
import { getValue } from 'floppy-disk';

describe('getValue', () => {
  it('getValue returns value directly', () => {
    expect(getValue(123)).toBe(123);
  });

  it('getValue executes function with params', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const result = getValue(fn, 2, 3);
    expect(result).toBe(5);
    expect(fn).toHaveBeenCalledWith(2, 3);
  });
});
