import { adminRole, judgeRole } from "@bjcp-arena/contracts";
import { describe, expect, it, vi } from "vitest";
import { ApiClientHttpError, createApiClient, type FetchLike } from "../src/index.js";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

const publicUser = {
  id: 1,
  username: "abc123",
  nickname: "bjcpabc123",
  roles: adminRole | judgeRole,
  disabled: false,
  authVersion: 0,
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
};

describe("createApiClient", () => {
  it("requests the ping endpoint against the configured base URL", async () => {
    const fetcher: FetchLike = vi.fn(async () =>
      jsonResponse({
        message: "pong",
        service: "bjcp-arena-api",
      })
    );
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

  it("calls bootstrap status without authorization even when a token provider is configured", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ hasUsers: false }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.getBootstrapStatus()).resolves.toEqual({ hasUsers: false });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/auth/bootstrap-status", {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
    });
  });

  it("posts login input and parses auth session", async () => {
    const fetcher: FetchLike = vi.fn(async () =>
      jsonResponse({
        token: "jwt-token",
        user: publicUser,
      })
    );
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
    });

    await expect(client.login({ username: "abc123", password: "secret123" })).resolves.toEqual({
      token: "jwt-token",
      user: publicUser,
    });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/auth/login", {
      body: JSON.stringify({ username: "abc123", password: "secret123" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("posts bootstrap super admin input without authorization", async () => {
    const fetcher: FetchLike = vi.fn(async () =>
      jsonResponse({
        token: "jwt-token",
        user: publicUser,
      })
    );
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.bootstrapSuperAdmin({ password: "secret123" })).resolves.toEqual({
      token: "jwt-token",
      user: publicUser,
    });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/auth/bootstrap-super-admin", {
      body: JSON.stringify({ password: "secret123" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("adds bearer token for me", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ user: publicUser }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.me()).resolves.toEqual({ user: publicUser });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/auth/me", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "GET",
    });
  });

  it("reads the latest token for each authenticated request", async () => {
    let token = "first-token";
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ user: publicUser }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => token,
    });

    await client.me();
    token = "second-token";
    await client.me();

    expect(fetcher).toHaveBeenNthCalledWith(1, "http://localhost:4000/api/auth/me", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer first-token",
      },
      method: "GET",
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, "http://localhost:4000/api/auth/me", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer second-token",
      },
      method: "GET",
    });
  });

  it("posts logout without a content type when there is no body", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ ok: true }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.logout()).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/auth/logout", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "POST",
    });
  });

  it("adds bearer token for list users", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ users: [publicUser] }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.listUsers()).resolves.toEqual({ users: [publicUser] });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/users", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "GET",
    });
  });

  it("posts create user input with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ user: publicUser }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(
      client.createUser({
        username: "newuser",
        nickname: "New User",
        password: "secret123",
        roles: judgeRole,
      })
    ).resolves.toEqual({ user: publicUser });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/users", {
      body: JSON.stringify({
        username: "newuser",
        nickname: "New User",
        password: "secret123",
        roles: judgeRole,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "POST",
    });
  });

  it("patches update user input with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ user: publicUser }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.updateUser(1, { disabled: true })).resolves.toEqual({ user: publicUser });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/users/1", {
      body: JSON.stringify({ disabled: true }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });
  });

  it("posts reset password input with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ user: publicUser }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.resetUserPassword(1, { password: "newSecret123" })).resolves.toEqual({
      user: publicUser,
    });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/users/1/reset-password", {
      body: JSON.stringify({ password: "newSecret123" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "POST",
    });
  });

  it("throws an HTTP error with status when the server response is not ok", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: async () => new Response("Service unavailable", { status: 503 }),
    });

    const error = await client.ping().catch((unknownError: unknown) => unknownError);

    expect(error).toBeInstanceOf(ApiClientHttpError);
    expect(error).toMatchObject({
      method: "GET",
      path: "/api/ping",
      status: 503,
    });
    expect(error).toHaveProperty("message", "GET /api/ping failed with status 503");
  });

  it("throws when the server response violates the contract", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: async () =>
        jsonResponse({
          message: "ok",
          service: "bjcp-arena-api",
        }),
    });

    await expect(client.ping()).rejects.toThrow();
  });
});
