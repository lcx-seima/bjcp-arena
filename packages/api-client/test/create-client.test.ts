import { describe, expect, it, vi } from "vitest";
import { createApiClient, type FetchLike } from "../src/index.js";

describe("createApiClient", () => {
  it("requests the ping endpoint against the configured base URL", async () => {
    const fetcher: FetchLike = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          message: "pong",
          service: "bjcp-arena-api",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    });
    const client = createApiClient({
      baseUrl: "http://localhost:4000/",
      fetch: fetcher,
    });

    await expect(client.ping()).resolves.toEqual({
      message: "pong",
      service: "bjcp-arena-api",
    });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/ping", {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
    });
  });

  it("throws when the server response is not ok", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: async () => new Response("Service unavailable", { status: 503 }),
    });

    await expect(client.ping()).rejects.toThrow("GET /api/ping failed with status 503");
  });

  it("throws when the server response violates the contract", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: async () =>
        new Response(
          JSON.stringify({
            message: "ok",
            service: "bjcp-arena-api",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        ),
    });

    await expect(client.ping()).rejects.toThrow();
  });
});
