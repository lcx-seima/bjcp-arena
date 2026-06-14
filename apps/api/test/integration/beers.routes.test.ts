import { describe, expect, it } from "vitest";
import {
  competitionListPath,
  createBeerInputSchema,
  createCompetitionInputSchema,
  createUserInputSchema,
  findBjcpSubcategory,
  judgeRole,
  beerByIdPath,
  beerListPath,
  beerQrCodesPath,
  beerQrCodeListResultSchema,
  beerResultSchema,
  beerStatusPath,
  updateBeerStatusInputSchema,
} from "@bjcp-arena/contracts";
import { createTestApp } from "../helpers/create-test-app.js";

async function bootstrapToken(app: ReturnType<typeof createTestApp>["app"]) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/bootstrap-super-admin",
    payload: { password: "secret123" },
  });

  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

async function createCompetition(app: ReturnType<typeof createTestApp>["app"], token: string) {
  const input = createCompetitionInputSchema.parse({
    name: "夏季杯",
    description: "酒款路由用例",
  });
  const response = await app.inject({
    method: "POST",
    url: competitionListPath,
    headers: { authorization: `Bearer ${token}` },
    payload: input,
  });

  expect(response.statusCode).toBe(200);
  return response.json() as { competition: { id: number } };
}

async function createBeer(app: ReturnType<typeof createTestApp>["app"], token: string, id: number, input: Record<string, unknown>) {
  const response = await app.inject({
    method: "POST",
    url: beerListPath(id),
    headers: { authorization: `Bearer ${token}` },
    payload: input,
  });

  expect(response.statusCode).toBe(200);
  return beerResultSchema.parse(response.json());
}

async function login(app: ReturnType<typeof createTestApp>["app"], username: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      username,
      password: "secret123",
    },
  });

  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

async function createUser(
  app: ReturnType<typeof createTestApp>["app"],
  token: string,
  input: Record<string, unknown>
) {
  return app.inject({
    method: "POST",
    url: "/api/users",
    headers: { authorization: `Bearer ${token}` },
    payload: input,
  });
}

describe("beer routes", () => {
  it("keeps entry numbers as 1/2/3 when deleting and creating later", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const first = await createBeer(app, token, competition.competition.id, {
      realName: "啤酒A",
      producer: "酿酒厂A",
      bjcpSubcategoryCode: "10A",
      description: "第一款",
    });
    const second = await createBeer(app, token, competition.competition.id, {
      realName: "啤酒B",
      producer: "酿酒厂B",
      bjcpSubcategoryCode: "21A",
      description: "第二款",
    });

    const removed = await app.inject({
      method: "PATCH",
      url: `${beerByIdPath(competition.competition.id, second.beer.id)}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "removed" },
    });
    expect(removed.statusCode).toBe(200);

    const third = await createBeer(app, token, competition.competition.id, {
      realName: "啤酒C",
      producer: "酿酒厂C",
      bjcpSubcategoryCode: "21B",
      description: "第三款",
    });

    expect([first.beer.entryNumber, second.beer.entryNumber, third.beer.entryNumber]).toEqual([
      1, 2, 3,
    ]);
    await app.close();
  });

  it("uses BJCP snapshot fields from selected subcategory", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);
    const style = findBjcpSubcategory("21A");
    expect(style).not.toBeNull();

    const created = await createBeer(app, token, competition.competition.id, {
      realName: "IPA Beer",
      producer: "酿酒厂D",
      bjcpSubcategoryCode: "21A",
      description: "样本",
    });

    expect(created.beer).toMatchObject({
      bjcpCategoryCode: style!.categoryCode,
      bjcpCategoryName: style!.categoryName,
      bjcpSubcategoryCode: style!.subcategoryCode,
      bjcpSubcategoryName: style!.subcategoryName,
    });
    await app.close();
  });

  it("updates BJCP subcategory and syncs snapshot", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const created = await createBeer(app, token, competition.competition.id, {
      realName: "German Beer",
      producer: "AltBrew",
      bjcpSubcategoryCode: "10A",
      description: "原始风味",
    });

    const target = findBjcpSubcategory("21A");
    expect(target).not.toBeNull();
    const updated = await app.inject({
      method: "PATCH",
      url: beerByIdPath(competition.competition.id, created.beer.id),
      headers: { authorization: `Bearer ${token}` },
      payload: {
        bjcpSubcategoryCode: "21A",
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(beerResultSchema.parse(updated.json())).toMatchObject({
      beer: {
        bjcpCategoryCode: target!.categoryCode,
        bjcpCategoryName: target!.categoryName,
        bjcpSubcategoryCode: target!.subcategoryCode,
        bjcpSubcategoryName: target!.subcategoryName,
      },
    });
    await app.close();
  });

  it("updates beer status to published", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const created = await createBeer(app, token, competition.competition.id, {
      realName: "Draft Beer",
      producer: "酿酒厂E",
      bjcpSubcategoryCode: "21B",
      description: "待发布",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `${beerByIdPath(competition.competition.id, created.beer.id)}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: updateBeerStatusInputSchema.parse({ status: "published" }),
    });

    expect(response.statusCode).toBe(200);
    expect(beerResultSchema.parse(response.json())).toMatchObject({
      beer: {
        id: created.beer.id,
        status: "published",
      },
    });
    await app.close();
  });

  it("returns qr codes for only published beers with judge urls", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const first = await createBeer(app, token, competition.competition.id, {
      realName: "Draft Beer",
      producer: "酿酒厂F",
      bjcpSubcategoryCode: "10A",
      description: "未发布",
    });
    const published = await createBeer(app, token, competition.competition.id, {
      realName: "Published Beer",
      producer: "酿酒厂G",
      bjcpSubcategoryCode: "21A",
      description: "发布",
    });
    const removed = await createBeer(app, token, competition.competition.id, {
      realName: "Removed Beer",
      producer: "酿酒厂H",
      bjcpSubcategoryCode: "21B",
      description: "待下架",
    });

    const removedResponse = await app.inject({
      method: "PATCH",
      url: `${beerByIdPath(competition.competition.id, removed.beer.id)}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "removed" },
    });
    expect(removedResponse.statusCode).toBe(200);

    const publishedResponse = await app.inject({
      method: "PATCH",
      url: `${beerByIdPath(competition.competition.id, published.beer.id)}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "published" },
    });
    expect(publishedResponse.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: "GET",
      url: beerQrCodesPath(competition.competition.id),
      headers: { authorization: `Bearer ${token}` },
    });

    expect(listResponse.statusCode).toBe(200);
    const list = beerQrCodeListResultSchema.parse(listResponse.json());
    expect(list.beers).toHaveLength(1);
    expect(list.beers[0]).toMatchObject({
      id: published.beer.id,
      competitionId: competition.competition.id,
      realName: published.beer.realName,
      producer: published.beer.producer,
      bjcpCategoryCode: published.beer.bjcpCategoryCode,
      bjcpCategoryName: published.beer.bjcpCategoryName,
      bjcpSubcategoryCode: published.beer.bjcpSubcategoryCode,
      bjcpSubcategoryName: published.beer.bjcpSubcategoryName,
      judgeUrl: `http://judge.test/competitions/${competition.competition.id}/beers/${published.beer.id}`,
    });
    expect(list.beers.some((entry) => entry.id === first.beer.id)).toBe(false);
    expect(list.beers.some((entry) => entry.id === removed.beer.id)).toBe(false);
    await app.close();
  });

  it("returns 400 for invalid beer route ids", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const responses = [
      await app.inject({
        method: "GET",
        url: "/api/competitions/not-a-number/beers",
        headers: { authorization: `Bearer ${token}` },
      }),
      await app.inject({
        method: "GET",
        url: "/api/competitions/1/beers/not-a-number",
        headers: { authorization: `Bearer ${token}` },
      }),
      await app.inject({
        method: "PATCH",
        url: "/api/competitions/1/beers/not-a-number/status",
        headers: { authorization: `Bearer ${token}` },
        payload: { status: "published" },
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(400);
    }
    await app.close();
  });

  it("returns 404 for beer collection endpoints when competition does not exist", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const missingCompetitionId = 999;

    const responses = [
      await app.inject({
        method: "GET",
        url: beerListPath(missingCompetitionId),
        headers: { authorization: `Bearer ${token}` },
      }),
      await app.inject({
        method: "POST",
        url: beerListPath(missingCompetitionId),
        headers: { authorization: `Bearer ${token}` },
        payload: createBeerInputSchema.parse({
          realName: "Missing competition beer",
          producer: "No Competition",
          bjcpSubcategoryCode: "10A",
          description: "应该返回 404",
        }),
      }),
      await app.inject({
        method: "GET",
        url: beerQrCodesPath(missingCompetitionId),
        headers: { authorization: `Bearer ${token}` },
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ message: "Competition not found" });
    }
    await app.close();
  });

  it("returns 404 when beer belongs to another competition", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const sourceCompetition = await createCompetition(app, token);
    const targetCompetition = await createCompetition(app, token);
    const created = await createBeer(app, token, sourceCompetition.competition.id, {
      realName: "Scoped Beer",
      producer: "酿酒厂J",
      bjcpSubcategoryCode: "21A",
      description: "属于另一场比赛",
    });

    const responses = [
      await app.inject({
        method: "GET",
        url: beerByIdPath(targetCompetition.competition.id, created.beer.id),
        headers: { authorization: `Bearer ${token}` },
      }),
      await app.inject({
        method: "PATCH",
        url: beerByIdPath(targetCompetition.competition.id, created.beer.id),
        headers: { authorization: `Bearer ${token}` },
        payload: { realName: "Wrong scope" },
      }),
      await app.inject({
        method: "PATCH",
        url: beerStatusPath(targetCompetition.competition.id, created.beer.id),
        headers: { authorization: `Bearer ${token}` },
        payload: { status: "published" },
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ message: "Beer not found" });
    }
    await app.close();
  });

  it("rejects empty beer updates", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);
    const created = await createBeer(app, token, competition.competition.id, {
      realName: "Empty Update",
      producer: "酿酒厂K",
      bjcpSubcategoryCode: "10A",
      description: "空更新检查",
    });

    const response = await app.inject({
      method: "PATCH",
      url: beerByIdPath(competition.competition.id, created.beer.id),
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("rejects non-admin and judge-only users from admin beer routes", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const created = await createBeer(app, token, competition.competition.id, {
      realName: "Judge denied",
      producer: "酿酒厂I",
      bjcpSubcategoryCode: "21A",
      description: "权限检查",
    });

    const userResponse = await createUser(
      app,
      token,
      createUserInputSchema.parse({
        username: "judgeforbidden",
        password: "secret123",
        nickname: "Judge only",
        roles: judgeRole,
      })
    );
    expect(userResponse.statusCode).toBe(200);

    const judgeToken = await login(app, "judgeforbidden");
    const responses = [
      await app.inject({
        method: "GET",
        url: beerListPath(competition.competition.id),
        headers: { authorization: `Bearer ${judgeToken}` },
      }),
      await app.inject({
        method: "POST",
        url: beerListPath(competition.competition.id),
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: createBeerInputSchema.parse({
          realName: "Bad",
          producer: "No",
          bjcpSubcategoryCode: "10A",
          description: "Forbidden",
        }),
      }),
      await app.inject({
        method: "PATCH",
        url: beerByIdPath(competition.competition.id, created.beer.id),
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: { realName: "nope" },
      }),
      await app.inject({
        method: "PATCH",
        url: `${beerByIdPath(competition.competition.id, created.beer.id)}/status`,
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: { status: "published" },
      }),
      await app.inject({
        method: "GET",
        url: beerQrCodesPath(competition.competition.id),
        headers: { authorization: `Bearer ${judgeToken}` },
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(403);
    }
    await app.close();
  });
});
