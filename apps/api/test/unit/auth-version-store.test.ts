import { describe, expect, it } from "vitest";
import {
  createMemoryAuthVersionStore,
  parseAuthVersionValue,
} from "../../src/auth/auth-version-store.js";

describe("auth version store", () => {
  it("stores and reads auth versions in memory", async () => {
    const store = createMemoryAuthVersionStore([[1, 2]]);

    expect(await store.get(1)).toBe(2);
    expect(await store.get(2)).toBeNull();

    await store.set(2, 4);

    expect(await store.get(2)).toBe(4);
    await store.close();
  });

  it("parses valid Redis authVersion values", () => {
    expect(parseAuthVersionValue("0")).toBe(0);
    expect(parseAuthVersionValue("42")).toBe(42);
  });

  it("rejects dirty Redis authVersion values", () => {
    expect(() => parseAuthVersionValue("not-a-number")).toThrow();
    expect(() => parseAuthVersionValue("1.5")).toThrow();
    expect(() => parseAuthVersionValue("-1")).toThrow();
  });
});
