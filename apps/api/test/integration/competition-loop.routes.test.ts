import { describe, expect, it } from "vitest";
import {
  addRoundBeerInputSchema,
  amateurScoreInputSchema,
  beerByIdPath,
  beerImportPath,
  beerListPath,
  beerResultSchema,
  competitionByIdPath,
  competitionListPath,
  competitionListResultSchema,
  competitionStatusPath,
  createBeerInputSchema,
  createCompetitionInputSchema,
  createRoundInputSchema,
  createUserInputSchema,
  importBeersInputSchema,
  importBeersResultSchema,
  judgeBeerLookupInputSchema,
  judgeBeerResultSchema,
  judgeCompetitionListPath,
  judgeRole,
  judgeRoundBeerDetailPath,
  judgeRoundBeerLookupPath,
  judgeRoundBeerScorePath,
  judgeRoundDetailResultSchema,
  judgeRoundDetailPath,
  judgeRoundListPath,
  judgeTypeConsumer,
  myScoreResultSchema,
  professionalScoreInputSchema,
  removeRoundBeerInputSchema,
  roundBeerPath,
  roundBeerResultSchema,
  roundByIdPath,
  roundListPath,
  roundResultSchema,
  roundStatusPath,
  submitMyScoreResultSchema,
  type JudgeType,
  updateCompetitionStatusInputSchema,
  userByIdPath,
  userResultSchema,
} from "@bjcp-arena/contracts";
import { createTestApp } from "../helpers/create-test-app.js";

type TestApp = ReturnType<typeof createTestApp>["app"];

async function bootstrapToken(app: TestApp) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/bootstrap-super-admin",
    payload: { password: "secret123" },
  });

  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

async function createCompetition(app: TestApp, token: string, name = "夏季赛") {
  const response = await app.inject({
    method: "POST",
    url: competitionListPath,
    headers: { authorization: `Bearer ${token}` },
    payload: createCompetitionInputSchema.parse({ name }),
  });

  expect(response.statusCode).toBe(200);
  return response.json().competition as { id: number };
}

async function createBeer(app: TestApp, token: string, competitionId: number, entryCode: string) {
  const response = await app.inject({
    method: "POST",
    url: beerListPath(competitionId),
    headers: { authorization: `Bearer ${token}` },
    payload: createBeerInputSchema.parse({
      entryCode,
      bjcpSubcategoryCode: "21A",
      categoryRemark: "",
      description: `介绍 ${entryCode}`,
      name: `真实酒名 ${entryCode}`,
      brewery: `酒厂 ${entryCode}`,
    }),
  });

  expect(response.statusCode).toBe(200);
  return beerResultSchema.parse(response.json()).beer;
}

async function createRound(app: TestApp, token: string, competitionId: number, name = "第一轮") {
  const response = await app.inject({
    method: "POST",
    url: roundListPath(competitionId),
    headers: { authorization: `Bearer ${token}` },
    payload: createRoundInputSchema.parse({ name }),
  });

  expect(response.statusCode).toBe(200);
  return roundResultSchema.parse(response.json()).round;
}

async function addRoundBeer(
  app: TestApp,
  token: string,
  competitionId: number,
  roundId: number,
  beerId: number
) {
  const response = await app.inject({
    method: "POST",
    url: roundBeerPath(competitionId, roundId),
    headers: { authorization: `Bearer ${token}` },
    payload: addRoundBeerInputSchema.parse({ beerId }),
  });

  expect(response.statusCode).toBe(200);
  return roundBeerResultSchema.parse(response.json()).beer;
}

async function createJudge(app: TestApp, token: string, username: string, judgeType: JudgeType) {
  const response = await app.inject({
    method: "POST",
    url: "/api/users",
    headers: { authorization: `Bearer ${token}` },
    payload: createUserInputSchema.parse({
      username,
      nickname: `${username} 昵称`,
      password: "secret123",
      roles: judgeRole,
      judgeType,
    }),
  });

  expect(response.statusCode).toBe(200);
  return userResultSchema.parse(response.json()).user;
}

async function login(app: TestApp, username: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "secret123" },
  });

  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

const professionalScore = professionalScoreInputSchema.parse({
  professionalAromaScore: 10,
  professionalAromaComment: "香气干净，酒花明确",
  professionalAppearanceScore: 3,
  professionalAppearanceComment: "颜色清澈，泡沫稳定",
  professionalFlavorScore: 18,
  professionalFlavorComment: "入口平衡，收口干净",
  professionalMouthfeelScore: 4,
  professionalMouthfeelComment: "酒体中等，杀口适中",
  professionalOverallScore: 8,
  professionalOverallComment: "整体完成度高",
});

const amateurScore = amateurScoreInputSchema.parse({
  amateurDrinkabilityScore: 4,
  amateurBalanceScore: 5,
  amateurFlavorAcceptanceScore: 4,
  amateurRepeatIntentionScore: 5,
  amateurComment: "轻松顺口，愿意复饮",
});

describe("competition loop routes", () => {
  it("lists competitions with pagination query parameters", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    await createCompetition(app, token, "第一场");
    await createCompetition(app, token, "第二场");

    const response = await app.inject({
      method: "GET",
      url: `${competitionListPath}?page=1&limit=1`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const result = competitionListResultSchema.parse(response.json());
    expect(result).toMatchObject({
      total: 2,
      page: 1,
      limit: 1,
    });
    expect(result.competitions).toHaveLength(1);
    await app.close();
  });

  it("upserts beers by entry code and keeps entry number stable", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const first = await createBeer(app, token, competition.id, "sa1234");
    const secondResponse = await app.inject({
      method: "POST",
      url: beerListPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: createBeerInputSchema.parse({
        entryCode: "SA1234",
        bjcpSubcategoryCode: "21B",
        categoryRemark: "  特殊 IPA：黑 IPA  ",
        description: "更新介绍",
        name: "更新酒名",
        brewery: "更新酒厂",
      }),
    });

    expect(secondResponse.statusCode).toBe(200);
    const second = beerResultSchema.parse(secondResponse.json()).beer;
    expect(second).toMatchObject({
      id: first.id,
      entryCode: "SA1234",
      entryNumber: 1,
      bjcpSubcategoryCode: "21B",
      categoryRemark: "特殊 IPA：黑 IPA",
      description: "更新介绍",
      name: "更新酒名",
      brewery: "更新酒厂",
    });
    await app.close();
  });

  it("returns beer names and breweries in admin round beer results", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);
    const beer = await createBeer(app, token, competition.id, "SA1235");
    const round = await createRound(app, token, competition.id);

    const addedBeer = await addRoundBeer(app, token, competition.id, round.id, beer.id);
    expect(addedBeer).toMatchObject({
      name: "真实酒名 SA1235",
      brewery: "酒厂 SA1235",
    });

    const response = await app.inject({
      method: "GET",
      url: roundBeerPath(competition.id, round.id),
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().beers).toMatchObject([
      { name: "真实酒名 SA1235", brewery: "酒厂 SA1235" },
    ]);
    await app.close();
  });

  it("updates beer category remarks independently", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);
    const beer = await createBeer(app, token, competition.id, "SA1235");

    const response = await app.inject({
      method: "PATCH",
      url: beerByIdPath(competition.id, beer.id),
      headers: { authorization: `Bearer ${token}` },
      payload: {
        categoryRemark: "  可按 American IPA 评审，另加干投备注  ",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(beerResultSchema.parse(response.json()).beer).toMatchObject({
      id: beer.id,
      categoryRemark: "可按 American IPA 评审，另加干投备注",
      description: "介绍 SA1235",
    });
    await app.close();
  });

  it("imports beers atomically and reports invalid row numbers", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);

    const invalid = await app.inject({
      method: "POST",
      url: beerImportPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: {
        beers: [
          {
            rowNumber: 2,
            entryCode: "SA1001",
            bjcpSubcategoryCode: "21A",
            categoryRemark: "不应写入",
            description: "有效",
            name: "有效酒",
            brewery: "有效酒厂",
          },
          {
            rowNumber: 3,
            entryCode: "BAD",
            bjcpSubcategoryCode: "21A",
            description: "无效",
            name: "无效酒",
            brewery: "无效酒厂",
          },
        ],
      },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      message: expect.stringContaining("第 3 行"),
    });

    const duplicate = await app.inject({
      method: "POST",
      url: beerImportPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: importBeersInputSchema.parse({
        beers: [
          {
            rowNumber: 6,
            entryCode: "SA1001",
            bjcpSubcategoryCode: "21A",
            description: "第一条",
            name: "酒款一",
            brewery: "酒厂一",
          },
          {
            rowNumber: 9,
            entryCode: "sa1001",
            bjcpSubcategoryCode: "21A",
            description: "重复条目",
            name: "酒款二",
            brewery: "酒厂二",
          },
        ],
      }),
    });

    expect(duplicate.statusCode).toBe(400);
    expect(duplicate.json()).toEqual({
      message: "第 9 行：参赛ID SA1001 重复，首次出现在第 6 行",
    });

    const emptyList = await app.inject({
      method: "GET",
      url: beerListPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
    });
    expect(emptyList.json()).toMatchObject({ beers: [] });

    const valid = await app.inject({
      method: "POST",
      url: beerImportPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: importBeersInputSchema.parse({
        beers: [
          {
            rowNumber: 2,
            entryCode: "SA1001",
            bjcpSubcategoryCode: "21A",
            categoryRemark: "导入备注",
            description: "有效",
            name: "有效酒",
            brewery: "有效酒厂",
          },
        ],
      }),
    });

    expect(valid.statusCode).toBe(200);
    expect(importBeersResultSchema.parse(valid.json())).toMatchObject({
      created: 1,
      updated: 0,
      beers: [{ entryCode: "SA1001", entryNumber: 1, categoryRemark: "导入备注" }],
    });

    const mixed = await app.inject({
      method: "POST",
      url: beerImportPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: importBeersInputSchema.parse({
        beers: [
          {
            rowNumber: 2,
            entryCode: "SA1001",
            bjcpSubcategoryCode: "21A",
            description: "更新介绍",
            name: "更新酒名",
            brewery: "更新酒厂",
          },
          {
            rowNumber: 3,
            entryCode: "SA1002",
            bjcpSubcategoryCode: "999",
            description: "新增介绍",
            name: "新增酒名",
            brewery: "新增酒厂",
          },
        ],
      }),
    });
    expect(importBeersResultSchema.parse(mixed.json())).toMatchObject({
      created: 1,
      updated: 1,
      beers: [
        { entryCode: "SA1001", entryNumber: 1, name: "更新酒名" },
        { entryCode: "SA1002", entryNumber: 2, name: "新增酒名" },
      ],
    });
    await app.close();
  });

  it("enforces the competition close, archive, restore and reopen state machine", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const competition = await createCompetition(app, token);
    const round = await createRound(app, token, competition.id);

    const blocked = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: updateCompetitionStatusInputSchema.parse({ status: "ended" }),
    });
    expect(blocked.statusCode).toBe(409);

    const endRound = await app.inject({
      method: "PATCH",
      url: roundStatusPath(competition.id, round.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "ended" },
    });
    expect(endRound.statusCode).toBe(200);

    const ended = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "ended" },
    });
    expect(ended.statusCode).toBe(200);

    const archiveWithoutConfirm = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "archived" },
    });
    expect(archiveWithoutConfirm.statusCode).toBe(409);

    const archived = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "archived", confirm: true },
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json().competition.status).toBe("archived");

    const idempotentArchive = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "archived" },
    });
    expect(idempotentArchive.statusCode).toBe(200);

    const directReopen = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "ongoing", confirm: true },
    });
    expect(directReopen.statusCode).toBe(409);

    const restored = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "ended" },
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json().competition.status).toBe("ended");

    const reopenWithoutConfirm = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "ongoing" },
    });
    expect(reopenWithoutConfirm.statusCode).toBe(409);

    const reopened = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "ongoing", confirm: true },
    });
    expect(reopened.statusCode).toBe(200);

    const directArchive = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "archived", confirm: true },
    });
    expect(directArchive.statusCode).toBe(409);
    await app.close();
  });

  it("keeps archived competitions admin-readable and blocks every admin and judge mutation path", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken, "归档测试赛");
    const beer = await createBeer(app, adminToken, competition.id, "SA4101");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "archivejudge", "public");
    const judgeToken = await login(app, "archivejudge");

    const submitted = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(submitted.statusCode).toBe(200);

    const endedRound = await app.inject({
      method: "PATCH",
      url: roundStatusPath(competition.id, round.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(endedRound.statusCode).toBe(200);

    const endedCompetition = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(endedCompetition.statusCode).toBe(200);

    const archivedCompetition = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "archived", confirm: true },
    });
    expect(archivedCompetition.statusCode).toBe(200);

    const defaultList = await app.inject({
      method: "GET",
      url: competitionListPath,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(defaultList.statusCode).toBe(200);
    expect(competitionListResultSchema.parse(defaultList.json())).toMatchObject({
      competitions: [],
      total: 0,
    });

    const archiveList = await app.inject({
      method: "GET",
      url: `${competitionListPath}?archiveScope=archived&page=1&limit=1`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(archiveList.statusCode).toBe(200);
    expect(competitionListResultSchema.parse(archiveList.json())).toMatchObject({
      competitions: [{ id: competition.id, status: "archived" }],
      total: 1,
      page: 1,
      limit: 1,
    });

    const adminReads = [
      competitionByIdPath(competition.id),
      beerListPath(competition.id),
      roundListPath(competition.id),
      roundBeerPath(competition.id, round.id),
    ];
    for (const url of adminReads) {
      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(200);
    }

    const adminWrites = [
      {
        method: "PATCH" as const,
        url: competitionByIdPath(competition.id),
        payload: { name: "不可修改" },
      },
      {
        method: "POST" as const,
        url: beerListPath(competition.id),
        payload: createBeerInputSchema.parse({
          entryCode: "SA4102",
          bjcpSubcategoryCode: "21A",
          description: "不可新增",
          name: "不可新增",
          brewery: "不可新增",
        }),
      },
      {
        method: "PATCH" as const,
        url: beerByIdPath(competition.id, beer.id),
        payload: { name: "不可修改" },
      },
      {
        method: "POST" as const,
        url: beerImportPath(competition.id),
        payload: importBeersInputSchema.parse({
          beers: [
            {
              rowNumber: 2,
              entryCode: "SA4103",
              bjcpSubcategoryCode: "21A",
              description: "不可导入",
              name: "不可导入",
              brewery: "不可导入",
            },
          ],
        }),
      },
      {
        method: "POST" as const,
        url: roundListPath(competition.id),
        payload: { name: "不可新增" },
      },
      {
        method: "PATCH" as const,
        url: roundByIdPath(competition.id, round.id),
        payload: { name: "不可修改" },
      },
      {
        method: "PATCH" as const,
        url: roundStatusPath(competition.id, round.id),
        payload: { status: "ongoing", confirm: true },
      },
      {
        method: "DELETE" as const,
        url: roundByIdPath(competition.id, round.id),
      },
      {
        method: "POST" as const,
        url: roundBeerPath(competition.id, round.id),
        payload: { beerId: beer.id },
      },
      {
        method: "DELETE" as const,
        url: `${roundBeerPath(competition.id, round.id)}/${beer.id}`,
        payload: { confirm: true },
      },
    ];
    for (const request of adminWrites) {
      const response = await app.inject({
        ...request,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(409);
    }

    const judgeCompetitions = await app.inject({
      method: "GET",
      url: judgeCompetitionListPath,
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(judgeCompetitions.statusCode).toBe(200);
    expect(judgeCompetitions.json().competitions).toEqual([]);

    const judgeArchivedRequests = [
      { method: "GET" as const, url: judgeRoundListPath(competition.id) },
      { method: "GET" as const, url: judgeRoundDetailPath(competition.id, round.id) },
      {
        method: "POST" as const,
        url: judgeRoundBeerLookupPath(competition.id, round.id),
        payload: { entryCode: beer.entryCode },
      },
      {
        method: "GET" as const,
        url: judgeRoundBeerDetailPath(competition.id, round.id, beer.id),
      },
      {
        method: "GET" as const,
        url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      },
      {
        method: "PUT" as const,
        url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
        payload: { judgeType: "public", ...amateurScore },
      },
      {
        method: "DELETE" as const,
        url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      },
    ];
    for (const request of judgeArchivedRequests) {
      const response = await app.inject({
        ...request,
        headers: { authorization: `Bearer ${judgeToken}` },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ message: "比赛不存在" });
    }

    const restored = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(restored.statusCode).toBe(200);

    const restoredJudgeCompetitions = await app.inject({
      method: "GET",
      url: judgeCompetitionListPath,
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(restoredJudgeCompetitions.statusCode).toBe(200);
    expect(restoredJudgeCompetitions.json().competitions).toMatchObject([
      { id: competition.id, status: "ended" },
    ]);

    const restoredRounds = await app.inject({
      method: "GET",
      url: judgeRoundListPath(competition.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(restoredRounds.statusCode).toBe(200);

    const restoredSubmit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(restoredSubmit.statusCode).toBe(409);

    const restoredDelete = await app.inject({
      method: "DELETE",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(restoredDelete.statusCode).toBe(409);
    await app.close();
  });

  it("soft-deletes scores when removing a scored beer from a round", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA2001");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "projudge", "professional");
    const judgeToken = await login(app, "projudge");

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "professional", ...professionalScore },
    });
    expect(submit.statusCode).toBe(200);

    const removeWithoutConfirm = await app.inject({
      method: "DELETE",
      url: `${roundBeerPath(competition.id, round.id)}/${beer.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: removeRoundBeerInputSchema.parse({}),
    });
    expect(removeWithoutConfirm.statusCode).toBe(409);
    expect(removeWithoutConfirm.json()).toMatchObject({ scoreCount: 1 });

    const removed = await app.inject({
      method: "DELETE",
      url: `${roundBeerPath(competition.id, round.id)}/${beer.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { confirm: true },
    });
    expect(removed.statusCode).toBe(200);

    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    const detail = await app.inject({
      method: "GET",
      url: judgeRoundDetailPath(competition.id, round.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().beers).toEqual([]);
    await app.close();
  });

  it("lets judges list competitions, find round beers by entry code and submit scores without private beer fields", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3001");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "publicjudge", "public");
    const judgeToken = await login(app, "publicjudge");

    const competitions = await app.inject({
      method: "GET",
      url: judgeCompetitionListPath,
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(competitions.statusCode).toBe(200);
    expect(competitions.json().competitions[0]).toMatchObject({ id: competition.id });

    const rounds = await app.inject({
      method: "GET",
      url: judgeRoundListPath(competition.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(rounds.statusCode).toBe(200);
    expect(rounds.json().rounds[0]).toMatchObject({ id: round.id });

    const lookup = await app.inject({
      method: "POST",
      url: judgeRoundBeerLookupPath(competition.id, round.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: judgeBeerLookupInputSchema.parse({ entryCode: "sa3001" }),
    });
    expect(lookup.statusCode).toBe(200);
    const judgeBeer = judgeBeerResultSchema.parse(lookup.json()).beer;
    expect(judgeBeer).toMatchObject({
      id: beer.id,
      entryCode: "SA3001",
      categoryRemark: "",
      bjcpSubcategoryDoc: "https://www.bjcp.org/style/2021/21/21A/american-ipa/",
      canScore: true,
    });
    expect("name" in judgeBeer).toBe(false);
    expect("brewery" in judgeBeer).toBe(false);

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(submit.statusCode).toBe(200);
    expect(submitMyScoreResultSchema.parse(submit.json()).score).toMatchObject({
      roundId: round.id,
      beerId: beer.id,
      judgeTypeSnapshot: "public",
      amateurTotalScore: 18,
    });

    const detail = await app.inject({
      method: "GET",
      url: judgeRoundDetailPath(competition.id, round.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(judgeRoundDetailResultSchema.parse(detail.json()).beers[0]).toMatchObject({
      id: beer.id,
      totalScore: 18,
    });
    await app.close();
  });

  it("stores consumer scores with professional totals and an independent type snapshot", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3002");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "consumerjudge", judgeTypeConsumer);
    const judgeToken = await login(app, "consumerjudge");

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: judgeTypeConsumer, ...professionalScore },
    });

    expect(submit.statusCode).toBe(200);
    expect(submitMyScoreResultSchema.parse(submit.json()).score).toMatchObject({
      judgeTypeSnapshot: judgeTypeConsumer,
      professionalTotalScore: 43,
      professionalGrade: "Excellent",
      amateurTotalScore: null,
    });

    const detail = await app.inject({
      method: "GET",
      url: judgeRoundDetailPath(competition.id, round.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(judgeRoundDetailResultSchema.parse(detail.json()).beers[0]).toMatchObject({
      id: beer.id,
      totalScore: 43,
    });
    await app.close();
  });

  it("rejects public score fields from a consumer judge", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3003");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "consumerjudge2", judgeTypeConsumer);
    const judgeToken = await login(app, "consumerjudge2");

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });

    expect(submit.statusCode).toBe(409);
    await app.close();
  });

  it("lets judges soft-delete only their own active score", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3051");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "deletejudgea", "public");
    await createJudge(app, adminToken, "deletejudgeb", "public");
    const judgeAToken = await login(app, "deletejudgea");
    const judgeBToken = await login(app, "deletejudgeb");

    const submitA = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeAToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(submitA.statusCode).toBe(200);

    const submitB = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeBToken}` },
      payload: {
        judgeType: "public",
        ...amateurScore,
        amateurDrinkabilityScore: 5,
        amateurComment: "另一个裁判的评分",
      },
    });
    expect(submitB.statusCode).toBe(200);

    const deleted = await app.inject({
      method: "DELETE",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeAToken}` },
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ ok: true });

    const scoreA = await app.inject({
      method: "GET",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeAToken}` },
    });
    expect(scoreA.statusCode).toBe(200);
    expect(myScoreResultSchema.parse(scoreA.json()).score).toBeNull();

    const roundA = await app.inject({
      method: "GET",
      url: judgeRoundDetailPath(competition.id, round.id),
      headers: { authorization: `Bearer ${judgeAToken}` },
    });
    expect(roundA.statusCode).toBe(200);
    expect(roundA.json().beers).toEqual([]);

    const scoreB = await app.inject({
      method: "GET",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeBToken}` },
    });
    expect(scoreB.statusCode).toBe(200);
    expect(myScoreResultSchema.parse(scoreB.json()).score).toMatchObject({
      amateurDrinkabilityScore: 5,
      amateurComment: "另一个裁判的评分",
    });
    await app.close();
  });

  it("rejects deleting a missing judge score", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3052");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "missingdeletejudge", "public");
    const judgeToken = await login(app, "missingdeletejudge");

    const deleted = await app.inject({
      method: "DELETE",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });

    expect(deleted.statusCode).toBe(404);
    await app.close();
  });

  it("rejects judge score deletion after the round has ended", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3053");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "roundendeddeletejudge", "public");
    const judgeToken = await login(app, "roundendeddeletejudge");

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(submit.statusCode).toBe(200);

    const ended = await app.inject({
      method: "PATCH",
      url: roundStatusPath(competition.id, round.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(ended.statusCode).toBe(200);

    const deleted = await app.inject({
      method: "DELETE",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(deleted.statusCode).toBe(409);
    await app.close();
  });

  it("rejects judge score deletion after the competition has ended", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3054");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "competitionendeddeletejudge", "public");
    const judgeToken = await login(app, "competitionendeddeletejudge");

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(submit.statusCode).toBe(200);

    const endedRound = await app.inject({
      method: "PATCH",
      url: roundStatusPath(competition.id, round.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(endedRound.statusCode).toBe(200);

    const endedCompetition = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(endedCompetition.statusCode).toBe(200);

    const deleted = await app.inject({
      method: "DELETE",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });
    expect(deleted.statusCode).toBe(409);
    await app.close();
  });

  it("returns judge beer category remarks without a BJCP document link for unclassified beers", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const createUnclassified = await app.inject({
      method: "POST",
      url: beerListPath(competition.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: createBeerInputSchema.parse({
        entryCode: "SA3999",
        bjcpSubcategoryCode: "999",
        categoryRemark: "临时未分类",
        description: "待确认分类",
        name: "未分类酒",
        brewery: "未分类酒厂",
      }),
    });
    expect(createUnclassified.statusCode).toBe(200);
    const beer = beerResultSchema.parse(createUnclassified.json()).beer;
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "unclassifiedjudge", "public");
    const judgeToken = await login(app, "unclassifiedjudge");

    const detail = await app.inject({
      method: "GET",
      url: judgeRoundBeerDetailPath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });

    expect(detail.statusCode).toBe(200);
    const judgeBeer = judgeBeerResultSchema.parse(detail.json()).beer;
    expect(judgeBeer).toMatchObject({
      bjcpSubcategoryCode: "999",
      categoryRemark: "临时未分类",
    });
    expect(judgeBeer).not.toHaveProperty("bjcpSubcategoryDoc");
    await app.close();
  });

  it("keeps existing score judge type when the judge account type changes", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3101");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    const judge = await createJudge(app, adminToken, "changedjudge", "public");
    const publicJudgeToken = await login(app, "changedjudge");

    const firstSubmit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${publicJudgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(firstSubmit.statusCode).toBe(200);

    const typeChanged = await app.inject({
      method: "PATCH",
      url: userByIdPath(judge.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { judgeType: "professional" },
    });
    expect(typeChanged.statusCode).toBe(200);
    const professionalJudgeToken = await login(app, "changedjudge");

    const updatedSubmit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${professionalJudgeToken}` },
      payload: {
        judgeType: "public",
        ...amateurScore,
        amateurDrinkabilityScore: 5,
        amateurComment: "身份变更后仍按原大众评分表更新",
      },
    });

    expect(updatedSubmit.statusCode).toBe(200);
    expect(submitMyScoreResultSchema.parse(updatedSubmit.json()).score).toMatchObject({
      judgeTypeSnapshot: "public",
      amateurDrinkabilityScore: 5,
      amateurTotalScore: 19,
      amateurComment: "身份变更后仍按原大众评分表更新",
      professionalTotalScore: null,
    });
    await app.close();
  });

  it("rejects changing an existing score to a different judge type", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3102");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    const judge = await createJudge(app, adminToken, "switchjudge", "public");
    const publicJudgeToken = await login(app, "switchjudge");

    const firstSubmit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${publicJudgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(firstSubmit.statusCode).toBe(200);

    const typeChanged = await app.inject({
      method: "PATCH",
      url: userByIdPath(judge.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { judgeType: "professional" },
    });
    expect(typeChanged.statusCode).toBe(200);
    const professionalJudgeToken = await login(app, "switchjudge");

    const switchedSubmit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${professionalJudgeToken}` },
      payload: { judgeType: "professional", ...professionalScore },
    });

    expect(switchedSubmit.statusCode).toBe(409);
    await app.close();
  });

  it("still rejects creating a new score with a different judge type", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA3103");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "freshprofessional", "professional");
    const judgeToken = await login(app, "freshprofessional");

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });

    expect(submit.statusCode).toBe(409);
    await app.close();
  });

  it("makes ended rounds read-only for judges", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id, "SA4001");
    const round = await createRound(app, adminToken, competition.id);
    await addRoundBeer(app, adminToken, competition.id, round.id, beer.id);
    await createJudge(app, adminToken, "readonlyjudge", "public");
    const judgeToken = await login(app, "readonlyjudge");

    const ended = await app.inject({
      method: "PATCH",
      url: roundStatusPath(competition.id, round.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: "ended" },
    });
    expect(ended.statusCode).toBe(200);

    const submit = await app.inject({
      method: "PUT",
      url: judgeRoundBeerScorePath(competition.id, round.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: { judgeType: "public", ...amateurScore },
    });
    expect(submit.statusCode).toBe(409);
    await app.close();
  });
});
