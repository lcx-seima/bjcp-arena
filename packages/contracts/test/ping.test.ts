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
      lanIp: "192.168.1.23",
    });

    expect(result.message).toBe("pong");
    expect(result.service).toBe("bjcp-arena-api");
    expect(result.lanIp).toBe("192.168.1.23");
  });

  it("accepts a missing LAN IPv4 address", () => {
    expect(
      pingResultSchema.parse({
        message: "pong",
        service: "bjcp-arena-api",
        lanIp: null,
      }).lanIp
    ).toBeNull();
  });

  it("rejects responses that drift from the contract", () => {
    expect(() =>
      pingResultSchema.parse({
        message: "ok",
        service: "bjcp-arena-api",
        lanIp: "192.168.1.23",
      })
    ).toThrow();
  });

  it("rejects invalid LAN IP addresses", () => {
    expect(() =>
      pingResultSchema.parse({
        message: "pong",
        service: "bjcp-arena-api",
        lanIp: "not-an-ip",
      })
    ).toThrow();
  });
});
