import { describe, expect, it } from "vitest";
import { isPrefixPath } from "floppy-disk/react/use-store";

describe("isPrefixPath", () => {
  it("returns false when a segment does not match (early exit)", () => {
    const prefix = ["a", "x"];
    const target = ["a", "b", "c"];

    const result = isPrefixPath(prefix, target);

    expect(result).toBe(false);
  });
});
