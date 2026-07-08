import { describe, expect, it } from "vitest";
import { pingResultSchema } from "@bjcp-arena/contracts";
import { createApp } from "../../src/app.js";

describe("GET /api/ping", () => {
  it("returns the public ping response", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/ping",
    });

    expect(response.statusCode).toBe(200);
    expect(pingResultSchema.parse(response.json())).toEqual({
      message: "pong",
      service: "bjcp-arena-api",
    });
    await app.close();
  });

  it("allows configured local frontend origins", async () => {
    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/ping",
      headers: {
        origin: "http://localhost:5173",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    await app.close();
  });

  it("allows any origin when configured with a wildcard", async () => {
    const app = createApp({
      allowedOrigins: ["*"],
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/ping",
      headers: {
        origin: "http://example.com",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://example.com");
    await app.close();
  });

  it("allows PATCH requests in CORS preflight responses", async () => {
    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
    });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/users/2",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "PATCH",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
    await app.close();
  });

  it("allows DELETE requests in CORS preflight responses", async () => {
    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
    });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/competitions/1/rounds/2/beers/3",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "DELETE",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-methods"]).toContain("DELETE");
    await app.close();
  });

  it("does not allow origins outside the configured list", async () => {
    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/ping",
      headers: {
        origin: "http://example.com",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });
});
