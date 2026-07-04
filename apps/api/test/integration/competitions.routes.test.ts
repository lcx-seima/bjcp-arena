import { describe, expect, it } from "vitest";
import {
  competitionByIdPath,
  competitionListPath,
  competitionListResultSchema,
  competitionResultSchema,
  competitionStatusPath,
  createCompetitionInputSchema,
  createUserInputSchema,
  judgeRole,
  updateCompetitionStatusInputSchema,
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
    name: "夏季赛",
    description: "验收场景",
  });
  const response = await app.inject({
    method: "POST",
    url: competitionListPath,
    headers: { authorization: `Bearer ${token}` },
    payload: input,
  });

  expect(response.statusCode).toBe(200);
  return competitionResultSchema.parse(response.json());
}

async function createCompetitionNamed(
  app: ReturnType<typeof createTestApp>["app"],
  token: string,
  name: string
) {
  const response = await app.inject({
    method: "POST",
    url: competitionListPath,
    headers: { authorization: `Bearer ${token}` },
    payload: createCompetitionInputSchema.parse({
      name,
      description: "分页验收",
    }),
  });

  expect(response.statusCode).toBe(200);
  return competitionResultSchema.parse(response.json());
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

describe("competition routes", () => {
  it("allows super admin to create and read competitions", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const created = await createCompetition(app, token);

    expect(created.competition.status).toBe("draft");
    expect(competitionResultSchema.parse(created)).toMatchObject({
      competition: expect.objectContaining({
        name: "夏季赛",
        status: "draft",
      }),
    });

    await app.close();
  });

  it("updates competition status to judging", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const created = await createCompetition(app, token);
    const statusPayload = updateCompetitionStatusInputSchema.parse({
      status: "judging",
    });

    const response = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(created.competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: statusPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(competitionResultSchema.parse(response.json())).toMatchObject({
      competition: {
        id: created.competition.id,
        status: "judging",
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: competitionListPath,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listResponse.statusCode).toBe(200);
    const list = competitionListResultSchema.parse(listResponse.json());
    expect(list.competitions[0]).toMatchObject({
      id: created.competition.id,
      status: "judging",
    });
    expect(list).toMatchObject({
      total: 1,
      page: 1,
      limit: 50,
    });
    await app.close();
  });

  it("lists competitions with default 50 item pagination", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    for (let index = 1; index <= 55; index += 1) {
      await createCompetitionNamed(app, token, `分页比赛 ${index}`);
    }

    const response = await app.inject({
      method: "GET",
      url: competitionListPath,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const result = competitionListResultSchema.parse(response.json());
    expect(result.total).toBe(55);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.competitions).toHaveLength(50);
    expect(result.competitions[0]?.name).toBe("分页比赛 55");
    expect(result.competitions.at(-1)?.name).toBe("分页比赛 6");
    await app.close();
  });

  it("lists the second competition page", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    for (let index = 1; index <= 55; index += 1) {
      await createCompetitionNamed(app, token, `分页比赛 ${index}`);
    }

    const response = await app.inject({
      method: "GET",
      url: `${competitionListPath}?page=2&limit=50`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const result = competitionListResultSchema.parse(response.json());
    expect(result.total).toBe(55);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
    expect(result.competitions).toHaveLength(5);
    expect(result.competitions[0]?.name).toBe("分页比赛 5");
    expect(result.competitions.at(-1)?.name).toBe("分页比赛 1");
    await app.close();
  });

  it("rejects invalid competition pagination query", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const invalidPage = await app.inject({
      method: "GET",
      url: `${competitionListPath}?page=0`,
      headers: { authorization: `Bearer ${token}` },
    });
    const invalidLimit = await app.inject({
      method: "GET",
      url: `${competitionListPath}?limit=101`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(invalidPage.statusCode).toBe(400);
    expect(invalidLimit.statusCode).toBe(400);
    await app.close();
  });

  it("rejects judge-only users", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    await createUser(
      app,
      token,
      createUserInputSchema.parse({
        username: "judgeonly",
        nickname: "judge only",
        password: "secret123",
        roles: judgeRole,
      })
    );

    const judgeToken = await login(app, "judgeonly");

    const nonAdminResponses = [
      await app.inject({
        method: "GET",
        url: competitionListPath,
        headers: { authorization: `Bearer ${judgeToken}` },
      }),
      await app.inject({
        method: "POST",
        url: competitionListPath,
        headers: { authorization: `Bearer ${judgeToken}` },
        payload: createCompetitionInputSchema.parse({
          name: "非法创建",
          description: "不应允许",
        }),
      }),
      await app.inject({
        method: "GET",
        url: competitionByIdPath(1),
        headers: { authorization: `Bearer ${judgeToken}` },
      }),
    ];
    for (const response of nonAdminResponses) {
      expect(response.statusCode).toBe(403);
    }
    await app.close();
  });

  it("rejects missing and invalid tokens", async () => {
    const { app } = createTestApp();
    await bootstrapToken(app);

    const missingToken = await app.inject({
      method: "GET",
      url: competitionListPath,
    });
    const invalidToken = await app.inject({
      method: "GET",
      url: competitionListPath,
      headers: { authorization: "Bearer invalid-token" },
    });
    const invalidTokenPost = await app.inject({
      method: "POST",
      url: competitionListPath,
      headers: { authorization: "Bearer invalid-token" },
      payload: createCompetitionInputSchema.parse({
        name: "非法创建",
        description: "无效token",
      }),
    });

    expect(missingToken.statusCode).toBe(401);
    expect(invalidToken.statusCode).toBe(401);
    expect(invalidTokenPost.statusCode).toBe(401);
    await app.close();
  });
});
