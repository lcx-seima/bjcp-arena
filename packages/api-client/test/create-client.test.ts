import { adminRole, judgeRole } from "@bjcp-arena/contracts";
import { describe, expect, it, vi } from "vitest";
import { ApiClientHttpError, createApiClient, type FetchLike } from "../src/index.js";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
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
  status: "ongoing",
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
};

const beer = {
  id: 2,
  competitionId: 1,
  entryCode: "SA1234",
  entryNumber: 1,
  bjcpCategoryCode: "21",
  bjcpCategoryName: "IPA",
  bjcpSubcategoryCode: "21A",
  bjcpSubcategoryName: "American IPA",
  categoryRemark: "美式 IPA 备注",
  description: "酒款介绍",
  name: "真实酒名",
  brewery: "真实酒厂",
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
};

const round = {
  id: 3,
  competitionId: 1,
  name: "第一轮",
  status: "ongoing",
  beerCount: 1,
  scoreCount: 0,
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
};

const roundBeer = {
  id: 4,
  competitionId: 1,
  roundId: 3,
  beerId: 2,
  entryCode: "SA1234",
  entryNumber: 1,
  bjcpCategoryCode: "21",
  bjcpCategoryName: "IPA",
  bjcpSubcategoryCode: "21A",
  bjcpSubcategoryName: "American IPA",
  description: "酒款介绍",
  scoreCount: 0,
  createdAt: "2026-07-05T00:00:00.000Z",
};

const myScore = {
  id: 5,
  competitionId: 1,
  roundId: 3,
  beerId: 2,
  judgeUserId: 1,
  judgeTypeSnapshot: "public",
  judgeNicknameSnapshot: "裁判",
  professionalAromaScore: null,
  professionalAromaComment: null,
  professionalAppearanceScore: null,
  professionalAppearanceComment: null,
  professionalFlavorScore: null,
  professionalFlavorComment: null,
  professionalMouthfeelScore: null,
  professionalMouthfeelComment: null,
  professionalOverallScore: null,
  professionalOverallComment: null,
  professionalTotalScore: null,
  professionalGrade: null,
  amateurDrinkabilityScore: 4,
  amateurBalanceScore: 5,
  amateurFlavorAcceptanceScore: 4,
  amateurRepeatIntentionScore: 5,
  amateurTotalScore: 18,
  amateurComment: "愿意复饮",
  submittedAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
};

describe("createApiClient", () => {
  it("requests public and authenticated auth endpoints", async () => {
    const fetcher: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "pong", service: "bjcp-arena-api" }))
      .mockResolvedValueOnce(jsonResponse({ hasUsers: false }))
      .mockResolvedValueOnce(jsonResponse({ token: "jwt-token", user: publicUser }))
      .mockResolvedValueOnce(jsonResponse({ user: publicUser }))
      .mockResolvedValueOnce(jsonResponse({ user: { ...publicUser, nickname: "裁判 01" } }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000/",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await expect(client.ping()).resolves.toEqual({
      message: "pong",
      service: "bjcp-arena-api",
    });
    await expect(client.getBootstrapStatus()).resolves.toEqual({ hasUsers: false });
    await expect(client.login({ username: "abc123", password: "secret123" })).resolves.toEqual({
      token: "jwt-token",
      user: publicUser,
    });
    await expect(client.me()).resolves.toEqual({ user: publicUser });
    await expect(client.updateCurrentUser({ nickname: "裁判 01" })).resolves.toMatchObject({
      user: { nickname: "裁判 01" },
    });

    expect(fetcher).toHaveBeenNthCalledWith(4, "http://localhost:4000/api/auth/me", {
      headers: { Accept: "application/json", Authorization: "Bearer jwt-token" },
      method: "GET",
    });
    expect(fetcher).toHaveBeenNthCalledWith(5, "http://localhost:4000/api/auth/me", {
      body: JSON.stringify({ nickname: "裁判 01" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });
  });

  it("keeps user management methods authenticated", async () => {
    const fetcher: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ users: [publicUser], total: 1, page: 1, limit: 50 }))
      .mockResolvedValueOnce(jsonResponse({ user: publicUser }))
      .mockResolvedValueOnce(jsonResponse({ user: publicUser }))
      .mockResolvedValueOnce(jsonResponse({ user: publicUser }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await client.listUsers();
    await client.createUser({ username: "judge1", password: "secret123", roles: judgeRole });
    await client.updateUser(1, { disabled: true });
    await client.resetUserPassword(1, { password: "newSecret123" });

    expect(fetcher).toHaveBeenNthCalledWith(1, "http://localhost:4000/api/users?page=1&limit=50", {
      headers: { Accept: "application/json", Authorization: "Bearer jwt-token" },
      method: "GET",
    });
    expect(fetcher).toHaveBeenNthCalledWith(3, "http://localhost:4000/api/users/1", {
      body: JSON.stringify({ disabled: true }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });
  });

  it("calls admin competition, beer and round endpoints", async () => {
    const fetcher: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ competitions: [competition], total: 1, page: 1, limit: 50 })
      )
      .mockResolvedValueOnce(jsonResponse({ competition }))
      .mockResolvedValueOnce(jsonResponse({ competition: { ...competition, status: "archived" } }))
      .mockResolvedValueOnce(jsonResponse({ beer }))
      .mockResolvedValueOnce(jsonResponse({ beer: { ...beer, categoryRemark: "更新备注" } }))
      .mockResolvedValueOnce(jsonResponse({ created: 1, updated: 0, beers: [beer] }))
      .mockResolvedValueOnce(jsonResponse({ round }))
      .mockResolvedValueOnce(jsonResponse({ beer: roundBeer }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await client.listCompetitions({ page: 2, limit: 25, archiveScope: "archived" });
    await client.createCompetition({ name: "夏季赛" });
    await client.updateCompetitionStatus(1, { status: "archived", confirm: true });
    await client.createBeer(1, {
      entryCode: "sa1234",
      bjcpSubcategoryCode: "21A",
      categoryRemark: "  美式 IPA 备注  ",
      description: "酒款介绍",
      name: "真实酒名",
      brewery: "真实酒厂",
    });
    await client.updateBeer(1, 2, {
      categoryRemark: "更新备注",
    });
    await client.importBeers(1, {
      beers: [
        {
          rowNumber: 2,
          entryCode: "SA1234",
          bjcpSubcategoryCode: "21A",
          categoryRemark: "导入备注",
          description: "酒款介绍",
          name: "真实酒名",
          brewery: "真实酒厂",
        },
      ],
    });
    await client.createRound(1, { name: "第一轮" });
    await client.addRoundBeer(1, 3, { beerId: 2 });
    await client.removeRoundBeer(1, 3, 2, { confirm: true });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:4000/api/competitions?page=2&limit=25&archiveScope=archived",
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "GET",
      }
    );

    expect(fetcher).toHaveBeenNthCalledWith(3, "http://localhost:4000/api/competitions/1/status", {
      body: JSON.stringify({ status: "archived", confirm: true }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });

    expect(fetcher).toHaveBeenNthCalledWith(4, "http://localhost:4000/api/competitions/1/beers", {
      body: JSON.stringify({
        entryCode: "SA1234",
        bjcpSubcategoryCode: "21A",
        categoryRemark: "美式 IPA 备注",
        description: "酒款介绍",
        name: "真实酒名",
        brewery: "真实酒厂",
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "POST",
    });

    expect(fetcher).toHaveBeenNthCalledWith(5, "http://localhost:4000/api/competitions/1/beers/2", {
      body: JSON.stringify({ categoryRemark: "更新备注" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      method: "PATCH",
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      9,
      "http://localhost:4000/api/competitions/1/rounds/3/beers/2",
      {
        body: JSON.stringify({ confirm: true }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "DELETE",
      }
    );
  });

  it("calls judge flow endpoints", async () => {
    const judgeBeer = {
      id: 2,
      competitionId: 1,
      roundId: 3,
      entryCode: "SA1234",
      entryNumber: 1,
      bjcpCategoryCode: "21",
      bjcpCategoryName: "IPA",
      bjcpSubcategoryCode: "21A",
      bjcpSubcategoryName: "American IPA",
      bjcpSubcategoryDoc: "https://www.bjcp.org/style/2021/21/21A/american-ipa/",
      categoryRemark: "",
      description: "酒款介绍",
      roundStatus: "ongoing",
      competitionStatus: "ongoing",
      canScore: true,
    };
    const fetcher: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ competitions: [competition] }))
      .mockResolvedValueOnce(
        jsonResponse({
          competition,
          rounds: [{ ...round, submittedBeerCount: 0 }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          round: { ...round, submittedBeerCount: 1 },
          beers: [
            { ...judgeBeer, totalScore: 18, submittedAt: "2026-07-05T00:00:00.000Z" },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ beer: judgeBeer }))
      .mockResolvedValueOnce(jsonResponse({ score: myScore }))
      .mockResolvedValueOnce(jsonResponse({ score: myScore }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: fetcher,
      getToken: () => "jwt-token",
    });

    await client.listJudgeCompetitions();
    await client.listJudgeRounds(1);
    const judgeRound = await client.getJudgeRound(1, 3);
    expect(judgeRound.beers[0]?.totalScore).toBe(18);
    await client.lookupJudgeBeer(1, 3, { entryCode: "sa1234" });
    await client.getMyScore(1, 3, 2);
    await client.submitMyScore(1, 3, 2, {
      judgeType: "public",
      amateurDrinkabilityScore: 4,
      amateurBalanceScore: 5,
      amateurFlavorAcceptanceScore: 4,
      amateurRepeatIntentionScore: 5,
      amateurComment: "愿意复饮",
    });
    await client.deleteMyScore(1, 3, 2);

    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "http://localhost:4000/api/judge/competitions/1/rounds/3/beer-lookup",
      {
        body: JSON.stringify({ entryCode: "SA1234" }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "POST",
      }
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      7,
      "http://localhost:4000/api/judge/competitions/1/rounds/3/beers/2/my-score",
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer jwt-token",
        },
        method: "DELETE",
      }
    );
  });

  it("throws an HTTP error with parsed server message", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: async () => jsonResponse({ message: "仍有未结束轮次" }, 409),
    });

    const error = await client.ping().catch((unknownError: unknown) => unknownError);

    expect(error).toBeInstanceOf(ApiClientHttpError);
    expect(error).toMatchObject({
      method: "GET",
      path: "/api/ping",
      status: 409,
    });
    expect(error).toHaveProperty("message", "仍有未结束轮次");
  });

  it("throws when the server response violates the contract", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      fetch: async () => jsonResponse({ message: "ok", service: "bjcp-arena-api" }),
    });

    await expect(client.ping()).rejects.toThrow();
  });
});
