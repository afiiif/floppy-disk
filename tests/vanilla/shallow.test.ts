import { describe, expect, it } from 'vitest';
import { shallow } from 'floppy-disk';

describe('shallow', () => {
  it('compares primitives using Object.is', () => {
    expect(shallow(1, 1)).toBe(true);
    expect(shallow(1, 2)).toBe(false);
    expect(shallow('a', 'a')).toBe(true);
    expect(shallow('a', 'b')).toBe(false);
  });

  it('returns true for same reference', () => {
    const obj = { a: 1 };
    expect(shallow(obj, obj)).toBe(true);
  });

  it('returns false when one is null or not object', () => {
    expect(shallow(null, {})).toBe(false);
    expect(shallow({}, null)).toBe(false);
    expect(shallow(1, {} as any)).toBe(false);
  });

  it('returns true for shallow equal objects', () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false if object keys/values differ', () => {
    expect(shallow({ a: 1 }, { b: 1 })).toBe(false);
    expect(shallow({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false if key length differs', () => {
    expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('does not deeply compare nested objects', () => {
    expect(shallow({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
  });

  it('returns true for equal Maps', () => {
    const a = new Map([['a', 1]]);
    const b = new Map([['a', 1]]);
    expect(shallow(a, b)).toBe(true);
  });

  it('returns false if Map values differ', () => {
    const a = new Map([['a', 1]]);
    const b = new Map([['a', 2]]);
    expect(shallow(a, b)).toBe(false);
  });

  it('returns false if Map size differs', () => {
    const a = new Map([['a', 1]]);
    const b = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    expect(shallow(a, b)).toBe(false);
  });

  it('returns true for equal Sets', () => {
    const a = new Set([1, 2]);
    const b = new Set([2, 1]);
    expect(shallow(a, b)).toBe(true);
  });

  it('returns false if Set size differs', () => {
    const a = new Set([1]);
    const b = new Set([1, 2]);
    expect(shallow(a, b)).toBe(false);
  });

  it('returns false when Set has same size but missing value', () => {
    const a = new Set([1, 2]);
    const b = new Set([1, 3]);
    expect(shallow(a, b)).toBe(false);
  });

  it('handles NaN correctly', () => {
    expect(shallow(NaN, NaN)).toBe(true);
  });

  it('distinguishes +0 and -0', () => {
    expect(shallow(+0, -0)).toBe(false);
  });

  it('ignores prototype differences', () => {
    const a = Object.create(null);
    a.x = 1;
    const b = { x: 1 };
    expect(shallow(a, b)).toBe(true);
  });
});
