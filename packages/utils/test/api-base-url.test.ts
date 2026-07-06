import { describe, expect, test } from "vitest";
import { resolveApiBaseUrl } from "../src/index.js";

describe("resolveApiBaseUrl", () => {
  test("uses the default API base URL when no value is configured", () => {
    expect(resolveApiBaseUrl(undefined, "http://localhost:5174/")).toBe("http://localhost:4000");
  });

  test("uses the default API base URL when the configured value is blank", () => {
    expect(resolveApiBaseUrl("   ", "http://localhost:5174/")).toBe("http://localhost:4000");
  });

  test("keeps a full API base URL unchanged", () => {
    expect(resolveApiBaseUrl("http://api.example.test:4000", "http://localhost:5174/")).toBe(
      "http://api.example.test:4000"
    );
  });

  test("resolves a numeric port against the current page host", () => {
    expect(resolveApiBaseUrl("4000", "http://192.168.1.23:5174/competitions/1")).toBe(
      "http://192.168.1.23:4000"
    );
  });

  test("resolves a colon-prefixed port against the current page host", () => {
    expect(resolveApiBaseUrl(":4000", "http://192.168.1.23:5174/competitions/1")).toBe(
      "http://192.168.1.23:4000"
    );
  });

  test("preserves the current page protocol when resolving a port", () => {
    expect(resolveApiBaseUrl("4000", "https://example.test/admin")).toBe(
      "https://example.test:4000"
    );
  });

  test("rejects an out-of-range numeric port", () => {
    expect(() => resolveApiBaseUrl("65536", "http://localhost:5174/")).toThrow(
      "VITE_API_BASE_URL port must be between 1 and 65535"
    );
  });

  test("rejects an out-of-range colon-prefixed port", () => {
    expect(() => resolveApiBaseUrl(":0", "http://localhost:5174/")).toThrow(
      "VITE_API_BASE_URL port must be between 1 and 65535"
    );
  });
});
