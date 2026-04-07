import { describe, expect, it } from "vitest";
import { getHash, isPlainObject } from "floppy-disk";

describe("isPlainObject", () => {
  it("returns `true` for a plain object", () => {
    expect(isPlainObject({})).toBe(true);
  });

  it("returns `false` for an array", () => {
    expect(isPlainObject([])).toBe(false);
  });

  it("returns `false` for null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("returns `false` for undefined", () => {
    expect(isPlainObject(undefined)).toBe(false);
  });

  it("returns `true` for object with an undefined constructor", () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it("returns `false` if constructor does not have an Object-specific method", () => {
    class Foo {
      abc: any;
      constructor() {
        this.abc = {};
      }
    }
    expect(isPlainObject(new Foo())).toBeFalsy();
  });

  it("returns `false` if the object has a modified prototype", () => {
    function Graph(this: any) {
      this.vertices = [];
      this.edges = [];
    }
    Graph.prototype.addVertex = function (v: any) {
      this.vertices.push(v);
    };
    expect(isPlainObject(Object.create(Graph))).toBeFalsy();
  });

  it("returns `false` for object with custom prototype", () => {
    const CustomProto = Object.create({ a: 1 });
    const obj = Object.create(CustomProto);
    obj.b = 2;
    expect(isPlainObject(obj)).toBeFalsy();
  });
});

describe("getHash", () => {
  it("hashes primitive values", () => {
    expect(getHash(1)).toBe("1");
    expect(getHash("a")).toBe('"a"');
    expect(getHash(true)).toBe("true");
    expect(getHash(null)).toBe("null");
  });

  it("produces same hash for objects with different key order", () => {
    const a = { foo: 1, bar: 2 };
    const b = { bar: 2, foo: 1 };
    expect(getHash(a)).toBe(getHash(b));
  });

  it("produces stable hash for nested objects", () => {
    const a = { foo: { x: 1, y: 2 }, bar: true };
    const b = { bar: true, foo: { y: 2, x: 1 } };
    expect(getHash(a)).toBe(getHash(b));
  });

  it("respects array order", () => {
    const a = [1, 2];
    const b = [2, 1];
    expect(getHash(a)).not.toBe(getHash(b));
  });

  it("handles undefined consistently", () => {
    expect(getHash(undefined)).toBe(undefined);
  });

  it("does not sort non-plain objects (e.g., Date)", () => {
    const a = { date: new Date(0) };
    const b = { date: new Date(0) };
    expect(getHash(a)).toBe(getHash(b));
  });

  it("Date from timestamp equals Date from ISO string in hash", () => {
    const fromTimestamp = new Date(1772469000000);
    const fromISO = new Date("2026-03-02T16:30:00.000Z");
    expect(getHash({ value: fromTimestamp })).toBe('{"value":"2026-03-02T16:30:00.000Z"}');
    expect(getHash({ value: fromISO })).toBe('{"value":"2026-03-02T16:30:00.000Z"}');
  });

  it("throws on circular structure", () => {
    const obj: any = {};
    obj.self = obj;
    expect(() => getHash(obj)).toThrow();
  });
});
