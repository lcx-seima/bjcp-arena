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
  judgeType: null,
  disabled: false,
  authVersion: 0,
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
};

const competition = {
  id: 1,
  name: "夏季赛",
  description: null,
  status: "draft",
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
};

const beer = {
  id: 2,
  competitionId: 1,
  entryNumber: 1,
  realName: "真实酒款",
  producer: "酒厂",
  bjcpCategoryCode: "21",
  bjcpCategoryName: "IPA",
  bjcpSubcategoryCode: "21A",
  bjcpSubcategoryName: "American IPA",
  description: "酒款介绍",
  status: "published",
  createdAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
};

const myScore = {
  id: 3,
  beerId: 2,
  judgeUserId: 1,
  judgeTypeSnapshot: "professional",
  judgeNicknameSnapshot: "专业裁判",
  professionalAromaScore: 10,
  professionalAromaComment: "香气干净",
  professionalAppearanceScore: 3,
  professionalAppearanceComment: null,
  professionalFlavorScore: 18,
  professionalFlavorComment: null,
  professionalMouthfeelScore: 4,
  professionalMouthfeelComment: null,
  professionalOverallScore: 8,
  professionalOverallComment: null,
  professionalTotalScore: 43,
  publicOverallPreferenceScore: null,
  publicAromaBodyFoamScore: null,
  publicEntryAcceptanceScore: null,
  publicWillingToDrinkScore: null,
  publicComment: null,
  submittedAt: "2026-06-14T00:00:00.000Z",
  updatedAt: "2026-06-14T00:00:00.000Z",
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

  it("lists competitions with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ competitions: [competition] }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.listCompetitions()).resolves.toEqual({ competitions: [competition] });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/competitions", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "GET",
    });
  });

  it("creates competitions with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ competition }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.createCompetition({ name: "夏季赛" })).resolves.toEqual({
      competition,
    });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/competitions", {
      body: JSON.stringify({ name: "夏季赛" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "POST",
    });
  });

  it("updates competition status with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () =>
      jsonResponse({ competition: { ...competition, status: "judging" } })
    );
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.updateCompetitionStatus(1, { status: "judging" })).resolves.toEqual({
      competition: { ...competition, status: "judging" },
    });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/competitions/1/status", {
      body: JSON.stringify({ status: "judging" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });
  });

  it("creates beers with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ beer }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(
      client.createBeer(1, {
        realName: "真实酒款",
        producer: "酒厂",
        bjcpSubcategoryCode: "21A",
        description: "酒款介绍",
      })
    ).resolves.toEqual({ beer });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/competitions/1/beers", {
      body: JSON.stringify({
        realName: "真实酒款",
        producer: "酒厂",
        bjcpSubcategoryCode: "21A",
        description: "酒款介绍",
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "POST",
    });
  });

  it("lists beers with bearer token", async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ beers: [beer] }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.listBeers(1)).resolves.toEqual({ beers: [beer] });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/competitions/1/beers", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "GET",
    });
  });

  it("updates beer details and status with bearer token", async () => {
    const fetcher: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ beer: { ...beer, realName: "新酒名" } }))
      .mockResolvedValueOnce(jsonResponse({ beer: { ...beer, status: "removed" } }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.updateBeer(1, 2, { realName: "新酒名" })).resolves.toEqual({
      beer: { ...beer, realName: "新酒名" },
    });
    await expect(client.updateBeerStatus(1, 2, { status: "removed" })).resolves.toEqual({
      beer: { ...beer, status: "removed" },
    });
    expect(fetcher).toHaveBeenNthCalledWith(1, "http://localhost:4000/api/competitions/1/beers/2", {
      body: JSON.stringify({ realName: "新酒名" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/api/competitions/1/beers/2/status",
      {
        body: JSON.stringify({ status: "removed" }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "PATCH",
      }
    );
  });

  it("lists beer QR codes with bearer token", async () => {
    const qrBeer = {
      id: beer.id,
      competitionId: beer.competitionId,
      entryNumber: beer.entryNumber,
      realName: beer.realName,
      producer: beer.producer,
      bjcpCategoryCode: beer.bjcpCategoryCode,
      bjcpCategoryName: beer.bjcpCategoryName,
      bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
      bjcpSubcategoryName: beer.bjcpSubcategoryName,
      judgeUrl: "http://localhost:5174/competitions/1/beers/2",
    };
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ beers: [qrBeer] }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000/",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.listBeerQrCodes(1)).resolves.toEqual({ beers: [qrBeer] });
    expect(fetcher).toHaveBeenCalledWith("http://localhost:4000/api/competitions/1/qr-codes", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "GET",
    });
  });

  it("gets judge beer detail with bearer token", async () => {
    const judgeBeer = {
      id: beer.id,
      competitionId: beer.competitionId,
      entryNumber: beer.entryNumber,
      description: beer.description,
      status: beer.status,
      competitionStatus: "judging",
      canScore: true,
      bjcpCategoryCode: beer.bjcpCategoryCode,
      bjcpCategoryName: beer.bjcpCategoryName,
      bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
      bjcpSubcategoryName: beer.bjcpSubcategoryName,
    };
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ beer: judgeBeer }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.getJudgeBeer(1, 2)).resolves.toEqual({ beer: judgeBeer });
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/api/judge/competitions/1/beers/2",
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "GET",
      }
    );
  });

  it("gets and submits my score with bearer token", async () => {
    const fetcher: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ score: myScore }))
      .mockResolvedValueOnce(jsonResponse({ score: myScore }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.getMyScore(1, 2)).resolves.toEqual({ score: myScore });
    await expect(
      client.submitMyScore(1, 2, {
        judgeType: "professional",
        professionalAromaScore: 10,
        professionalAromaComment: "香气干净",
        professionalAppearanceScore: 3,
        professionalFlavorScore: 18,
        professionalMouthfeelScore: 4,
        professionalOverallScore: 8,
      })
    ).resolves.toEqual({ score: myScore });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/api/judge/competitions/1/beers/2/my-score",
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "GET",
      }
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/api/judge/competitions/1/beers/2/my-score",
      {
        body: expect.any(String),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "PUT",
      }
    );
    expect(JSON.parse(String(vi.mocked(fetcher).mock.calls[1]?.[1]?.body))).toEqual({
      professionalAromaScore: 10,
      professionalAromaComment: "香气干净",
      professionalAppearanceScore: 3,
      professionalFlavorScore: 18,
      professionalMouthfeelScore: 4,
      professionalOverallScore: 8,
      judgeType: "professional",
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
