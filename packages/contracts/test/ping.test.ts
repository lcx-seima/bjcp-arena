import { describe, expect, it } from "vitest";
import { pingPath, pingResultSchema, type PingResult } from "../src/index.js";

describe("ping contract", () => {
  it("defines the shared ping endpoint path", () => {
    expect(pingPath).toBe("/api/ping");
  });

  it("accepts the public ping response shape", () => {
    const result: PingResult = pingResultSchema.parse({
      message: "pong",
      service: "bjcp-arena-api",
    });

    expect(result.message).toBe("pong");
    expect(result.service).toBe("bjcp-arena-api");
  });

  it("rejects responses that drift from the contract", () => {
    expect(() =>
      pingResultSchema.parse({
        message: "ok",
        service: "bjcp-arena-api",
      })
    ).toThrow();
  });
});
