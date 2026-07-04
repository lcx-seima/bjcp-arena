import { describe, expect, it } from "vitest";
import {
  beerListPath,
  beerStatusPath,
  competitionListPath,
  competitionStatusPath,
  createBeerInputSchema,
  createCompetitionInputSchema,
  createUserInputSchema,
  judgeBeerDetailPath,
  judgeBeerResultSchema,
  judgeMyScorePath,
  judgeRole,
  myScoreResultSchema,
  scoreInputSchema,
  submitMyScoreResultSchema,
  userByIdPath,
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

async function login(app: TestApp, username: string) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "secret123" },
  });

  expect(response.statusCode).toBe(200);
  return response.json().token as string;
}

async function createCompetition(app: TestApp, adminToken: string, name = "夏季杯") {
  const response = await app.inject({
    method: "POST",
    url: competitionListPath,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: createCompetitionInputSchema.parse({ name, description: "评分测试" }),
  });

  expect(response.statusCode).toBe(200);
  return response.json().competition as { id: number };
}

async function setCompetitionStatus(
  app: TestApp,
  adminToken: string,
  competitionId: number,
  status: "draft" | "judging" | "closed" | "published"
) {
  const response = await app.inject({
    method: "PATCH",
    url: competitionStatusPath(competitionId),
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { status },
  });

  expect(response.statusCode).toBe(200);
}

async function createBeer(app: TestApp, adminToken: string, competitionId: number, suffix = "A") {
  const response = await app.inject({
    method: "POST",
    url: beerListPath(competitionId),
    headers: { authorization: `Bearer ${adminToken}` },
    payload: createBeerInputSchema.parse({
      realName: `真实酒名 ${suffix}`,
      producer: `真实酒厂 ${suffix}`,
      bjcpSubcategoryCode: "21A",
      description: `酒款描述 ${suffix}`,
    }),
  });

  expect(response.statusCode).toBe(200);
  return response.json().beer as { id: number; entryNumber: number };
}

async function setBeerStatus(
  app: TestApp,
  adminToken: string,
  competitionId: number,
  beerId: number,
  status: "draft" | "published" | "removed"
) {
  const response = await app.inject({
    method: "PATCH",
    url: beerStatusPath(competitionId, beerId),
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { status },
  });

  expect(response.statusCode).toBe(200);
}

async function createJudge(
  app: TestApp,
  adminToken: string,
  username: string,
  judgeType: "professional" | "public" | null
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/users",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: createUserInputSchema.parse({
      username,
      nickname: `${username} 昵称`,
      password: "secret123",
      roles: judgeRole,
      judgeType,
    }),
  });

  expect(response.statusCode).toBe(200);
  return response.json().user as { id: number };
}

const professionalScore = scoreInputSchema.parse({
  judgeType: "professional",
  professionalAromaScore: 10,
  professionalAromaComment: "香气干净",
  professionalAppearanceScore: 3,
  professionalFlavorScore: 18,
  professionalMouthfeelScore: 4,
  professionalOverallScore: 8,
  professionalOverallComment: "完成度高",
});

const publicScore = scoreInputSchema.parse({
  judgeType: "public",
  publicOverallPreferenceScore: 8,
  publicAromaBodyFoamScore: 4,
  publicEntryAcceptanceScore: 5,
  publicWillingToDrinkScore: 4,
  publicComment: "愿意再喝",
});

describe("score routes", () => {
  it("lets professional judges submit computed scores and read submittedAt", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id);
    await setBeerStatus(app, adminToken, competition.id, beer.id, "published");
    await setCompetitionStatus(app, adminToken, competition.id, "judging");
    await createJudge(app, adminToken, "projudge", "professional");
    const judgeToken = await login(app, "projudge");

    const submitResponse = await app.inject({
      method: "PUT",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: professionalScore,
    });

    expect(submitResponse.statusCode).toBe(200);
    const submitted = submitMyScoreResultSchema.parse(submitResponse.json());
    expect(submitted.score).toMatchObject({
      beerId: beer.id,
      judgeTypeSnapshot: "professional",
      professionalTotalScore: 43,
      publicOverallPreferenceScore: null,
    });
    expect(submitted.score.submittedAt).toEqual(expect.any(String));

    const myScoreResponse = await app.inject({
      method: "GET",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });

    expect(myScoreResponse.statusCode).toBe(200);
    const myScore = myScoreResultSchema.parse(myScoreResponse.json());
    expect(myScore.score?.submittedAt).toBe(submitted.score.submittedAt);
    await app.close();
  });

  it("saves public scores and clears professional fields", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id);
    await setBeerStatus(app, adminToken, competition.id, beer.id, "published");
    await setCompetitionStatus(app, adminToken, competition.id, "judging");
    await createJudge(app, adminToken, "publicjudge", "public");
    const judgeToken = await login(app, "publicjudge");

    const response = await app.inject({
      method: "PUT",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: publicScore,
    });

    expect(response.statusCode).toBe(200);
    expect(submitMyScoreResultSchema.parse(response.json()).score).toMatchObject({
      judgeTypeSnapshot: "public",
      publicOverallPreferenceScore: 8,
      publicAromaBodyFoamScore: 4,
      publicEntryAcceptanceScore: 5,
      publicWillingToDrinkScore: 4,
      professionalTotalScore: null,
    });
    await app.close();
  });

  it("upserts repeated submissions for the same beer and judge", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id);
    await setBeerStatus(app, adminToken, competition.id, beer.id, "published");
    await setCompetitionStatus(app, adminToken, competition.id, "judging");
    await createJudge(app, adminToken, "repeatjudge", "professional");
    const judgeToken = await login(app, "repeatjudge");

    const first = await app.inject({
      method: "PUT",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: professionalScore,
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "PUT",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
      payload: {
        ...professionalScore,
        professionalOverallScore: 6,
      },
    });
    expect(second.statusCode).toBe(200);

    const firstScore = submitMyScoreResultSchema.parse(first.json()).score;
    const secondScore = submitMyScoreResultSchema.parse(second.json()).score;
    expect(secondScore.id).toBe(firstScore.id);
    expect(secondScore.professionalTotalScore).toBe(41);
    await app.close();
  });

  it("keeps submitted judge type snapshot after the user judge type changes", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id);
    await setBeerStatus(app, adminToken, competition.id, beer.id, "published");
    await setCompetitionStatus(app, adminToken, competition.id, "judging");
    const judge = await createJudge(app, adminToken, "snapshotjudge", "professional");
    const professionalToken = await login(app, "snapshotjudge");

    const submitResponse = await app.inject({
      method: "PUT",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${professionalToken}` },
      payload: professionalScore,
    });
    expect(submitResponse.statusCode).toBe(200);

    const updateJudgeTypeResponse = await app.inject({
      method: "PATCH",
      url: userByIdPath(judge.id),
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { judgeType: "public" },
    });
    expect(updateJudgeTypeResponse.statusCode).toBe(200);
    const publicToken = await login(app, "snapshotjudge");

    const myScoreResponse = await app.inject({
      method: "GET",
      url: judgeMyScorePath(competition.id, beer.id),
      headers: { authorization: `Bearer ${publicToken}` },
    });
    expect(myScoreResponse.statusCode).toBe(200);
    expect(myScoreResultSchema.parse(myScoreResponse.json()).score).toMatchObject({
      id: submitMyScoreResultSchema.parse(submitResponse.json()).score.id,
      judgeTypeSnapshot: "professional",
      professionalTotalScore: 43,
    });

    await app.close();
  });

  it("rejects scoring outside judging competitions or unpublished beers", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    await createJudge(app, adminToken, "blockedjudge", "professional");
    const judgeToken = await login(app, "blockedjudge");

    const draftCompetition = await createCompetition(app, adminToken, "草稿赛事");
    const draftBeer = await createBeer(app, adminToken, draftCompetition.id, "draft");
    await setBeerStatus(app, adminToken, draftCompetition.id, draftBeer.id, "published");

    const judgingCompetition = await createCompetition(app, adminToken, "评审赛事");
    const unpublishedBeer = await createBeer(app, adminToken, judgingCompetition.id, "draft-beer");
    const removedBeer = await createBeer(app, adminToken, judgingCompetition.id, "removed-beer");
    await setBeerStatus(app, adminToken, judgingCompetition.id, removedBeer.id, "removed");
    await setCompetitionStatus(app, adminToken, judgingCompetition.id, "judging");

    const closedCompetition = await createCompetition(app, adminToken, "关闭赛事");
    const closedBeer = await createBeer(app, adminToken, closedCompetition.id, "closed");
    await setBeerStatus(app, adminToken, closedCompetition.id, closedBeer.id, "published");
    await setCompetitionStatus(app, adminToken, closedCompetition.id, "closed");

    const responses = [
      await app.inject({
        method: "PUT",
        url: judgeMyScorePath(draftCompetition.id, draftBeer.id),
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: professionalScore,
      }),
      await app.inject({
        method: "PUT",
        url: judgeMyScorePath(closedCompetition.id, closedBeer.id),
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: professionalScore,
      }),
      await app.inject({
        method: "PUT",
        url: judgeMyScorePath(judgingCompetition.id, unpublishedBeer.id),
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: professionalScore,
      }),
      await app.inject({
        method: "PUT",
        url: judgeMyScorePath(judgingCompetition.id, removedBeer.id),
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: professionalScore,
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(409);
    }
    await app.close();
  });

  it("returns judge beer detail without real name or producer", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id);
    await setBeerStatus(app, adminToken, competition.id, beer.id, "published");
    await setCompetitionStatus(app, adminToken, competition.id, "judging");
    await createJudge(app, adminToken, "detailjudge", "public");
    const judgeToken = await login(app, "detailjudge");

    const response = await app.inject({
      method: "GET",
      url: judgeBeerDetailPath(competition.id, beer.id),
      headers: { authorization: `Bearer ${judgeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const detail = judgeBeerResultSchema.parse(response.json());
    expect(detail.beer).toMatchObject({
      id: beer.id,
      entryNumber: beer.entryNumber,
      status: "published",
      competitionStatus: "judging",
      canScore: true,
    });
    expect("realName" in detail.beer).toBe(false);
    expect("producer" in detail.beer).toBe(false);
    await app.close();
  });

  it("returns 400 for invalid judge score ids and invalid score bodies", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    await createJudge(app, adminToken, "badrequestjudge", "professional");
    const judgeToken = await login(app, "badrequestjudge");

    const responses = [
      await app.inject({
        method: "GET",
        url: "/api/judge/competitions/not-a-number/beers/1",
        headers: { authorization: `Bearer ${judgeToken}` },
      }),
      await app.inject({
        method: "GET",
        url: "/api/judge/competitions/1/beers/not-a-number/my-score",
        headers: { authorization: `Bearer ${judgeToken}` },
      }),
      await app.inject({
        method: "PUT",
        url: "/api/judge/competitions/1/beers/1/my-score",
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: { judgeType: "professional", professionalAromaScore: 20 },
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(400);
    }
    await app.close();
  });

  it("rejects non-judge users from judge score routes", async () => {
    const { app } = createTestApp();
    const adminToken = await bootstrapToken(app);
    const competition = await createCompetition(app, adminToken);
    const beer = await createBeer(app, adminToken, competition.id);

    const responses = [
      await app.inject({
        method: "GET",
        url: judgeBeerDetailPath(competition.id, beer.id),
        headers: { authorization: `Bearer ${adminToken}` },
      }),
      await app.inject({
        method: "GET",
        url: judgeMyScorePath(competition.id, beer.id),
        headers: { authorization: `Bearer ${adminToken}` },
      }),
      await app.inject({
        method: "PUT",
        url: judgeMyScorePath(competition.id, beer.id),
        headers: { authorization: `Bearer ${adminToken}` },
        payload: professionalScore,
      }),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(403);
    }
    await app.close();
  });

});
