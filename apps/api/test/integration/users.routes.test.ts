import { describe, expect, it } from "vitest";
import {
  adminRole,
  authMePath,
  createUserInputSchema,
  judgeTypeProfessional,
  judgeTypePublic,
  judgeRole,
  resetUserPasswordInputSchema,
  superAdminRole,
  updateUserInputSchema,
  userByIdPath,
  userListResultSchema,
  userResetPasswordPath,
  userResultSchema,
  usersPath,
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

async function createUser(
  app: ReturnType<typeof createTestApp>["app"],
  token: string,
  input: Record<string, unknown>
) {
  return await app.inject({
    method: "POST",
    url: usersPath,
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

describe("user management routes", () => {
  it("allows super admin to create and list users", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const input = createUserInputSchema.parse({
      username: "judge01",
      nickname: "裁判 01",
      password: "secret123",
      roles: judgeRole,
    });

    const createResponse = await createUser(app, token, input);
    expect(createResponse.statusCode).toBe(200);
    expect(userResultSchema.parse(createResponse.json())).toMatchObject({
      user: {
        username: "judge01",
        nickname: "裁判 01",
        roles: judgeRole,
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: usersPath,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(userListResultSchema.parse(listResponse.json())).toMatchObject({
      total: 2,
      page: 1,
      limit: 50,
    });
    expect(userListResultSchema.parse(listResponse.json()).users).toHaveLength(2);
    await app.close();
  });

  it("lists users with default and custom pagination", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    for (let index = 1; index <= 55; index += 1) {
      const suffix = String(index).padStart(2, "0");
      const response = await createUser(app, token, {
        username: `judge${suffix}`,
        password: "secret123",
        roles: judgeRole,
      });
      expect(response.statusCode).toBe(200);
    }

    const defaultPage = await app.inject({
      method: "GET",
      url: usersPath,
      headers: { authorization: `Bearer ${token}` },
    });
    const secondPage = await app.inject({
      method: "GET",
      url: `${usersPath}?page=2&limit=10`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(defaultPage.statusCode).toBe(200);
    expect(userListResultSchema.parse(defaultPage.json())).toMatchObject({
      total: 56,
      page: 1,
      limit: 50,
    });
    expect(userListResultSchema.parse(defaultPage.json()).users).toHaveLength(50);
    expect(userListResultSchema.parse(defaultPage.json()).users[0]?.username).toBe("judge55");

    expect(secondPage.statusCode).toBe(200);
    expect(userListResultSchema.parse(secondPage.json())).toMatchObject({
      total: 56,
      page: 2,
      limit: 10,
    });
    expect(userListResultSchema.parse(secondPage.json()).users).toHaveLength(10);
    expect(userListResultSchema.parse(secondPage.json()).users[0]?.username).toBe("judge45");
    await app.close();
  });

  it("rejects invalid user list pagination query", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const response = await app.inject({
      method: "GET",
      url: `${usersPath}?page=0&limit=101`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("auto-generates username and nickname when omitted", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const response = await createUser(app, token, {
      password: "secret123",
      roles: judgeRole,
    });

    const body = userResultSchema.parse(response.json());
    expect(response.statusCode).toBe(200);
    expect(body.user.username).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(body.user.nickname).toMatch(/^bjcp_[A-Za-z0-9]{6}$/);
    await app.close();
  });

  it("rejects non-super-admin user management", async () => {
    const { app } = createTestApp();
    const superToken = await bootstrapToken(app);

    await createUser(app, superToken, {
      username: "admin01",
      password: "secret123",
      roles: adminRole,
    });
    await createUser(app, superToken, {
      username: "judge01",
      password: "secret123",
      roles: judgeRole,
    });

    const adminToken = await login(app, "admin01");
    const judgeToken = await login(app, "judge01");

    for (const token of [adminToken, judgeToken]) {
      const response = await app.inject({
        method: "GET",
        url: usersPath,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
    }
    await app.close();
  });

  it("rejects missing and invalid tokens", async () => {
    const { app } = createTestApp();
    await bootstrapToken(app);

    const missingToken = await app.inject({
      method: "GET",
      url: usersPath,
    });
    const invalidToken = await app.inject({
      method: "GET",
      url: usersPath,
      headers: { authorization: "Bearer invalid-token" },
    });

    expect(missingToken.statusCode).toBe(401);
    expect(invalidToken.statusCode).toBe(401);
    await app.close();
  });

  it("rejects duplicate username with conflict", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    await createUser(app, token, {
      username: "judge01",
      password: "secret123",
      roles: judgeRole,
    });
    const response = await createUser(app, token, {
      username: "judge01",
      password: "secret123",
      roles: judgeRole,
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it("updates user and bumps authVersion when access-affecting fields change", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const created = await createUser(app, token, {
      username: "judge01",
      password: "secret123",
      roles: judgeRole,
    });
    const id = userResultSchema.parse(created.json()).user.id;

    const response = await app.inject({
      method: "PATCH",
      url: userByIdPath(id),
      headers: { authorization: `Bearer ${token}` },
      payload: updateUserInputSchema.parse({
        username: "judge02",
        roles: judgeRole | adminRole,
        disabled: true,
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(userResultSchema.parse(response.json()).user).toMatchObject({
      id,
      username: "judge02",
      roles: judgeRole | adminRole,
      disabled: true,
      authVersion: 1,
    });
    await app.close();
  });

  it("rejects changes that would remove the last active super admin", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const me = await app.inject({
      method: "GET",
      url: authMePath,
      headers: { authorization: `Bearer ${token}` },
    });
    const superAdmin = userResultSchema.parse(me.json()).user;

    const disableResponse = await app.inject({
      method: "PATCH",
      url: userByIdPath(superAdmin.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { disabled: true },
    });
    const demoteResponse = await app.inject({
      method: "PATCH",
      url: userByIdPath(superAdmin.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { roles: adminRole },
    });

    expect(disableResponse.statusCode).toBe(409);
    expect(demoteResponse.statusCode).toBe(409);
    await app.close();
  });

  it("stores judge type on judge users and allows clearing it", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const created = await createUser(app, token, {
      username: "judge03",
      nickname: "裁判 03",
      password: "secret123",
      roles: judgeRole,
      judgeType: judgeTypeProfessional,
    });

    expect(created.statusCode).toBe(200);
    const id = userResultSchema.parse(created.json()).user.id;
    expect(userResultSchema.parse(created.json()).user.judgeType).toBe(judgeTypeProfessional);

    const updated = await app.inject({
      method: "PATCH",
      url: userByIdPath(id),
      headers: { authorization: `Bearer ${token}` },
      payload: { judgeType: judgeTypePublic },
    });

    expect(updated.statusCode).toBe(200);
    expect(userResultSchema.parse(updated.json()).user.judgeType).toBe(judgeTypePublic);

    const cleared = await app.inject({
      method: "PATCH",
      url: userByIdPath(id),
      headers: { authorization: `Bearer ${token}` },
      payload: { judgeType: null },
    });

    expect(cleared.statusCode).toBe(200);
    expect(userResultSchema.parse(cleared.json()).user.judgeType).toBeNull();
    await app.close();
  });

  it("rejects duplicate username during update with conflict", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    await createUser(app, token, {
      username: "judge01",
      password: "secret123",
      roles: judgeRole,
    });
    const created = await createUser(app, token, {
      username: "judge02",
      password: "secret123",
      roles: judgeRole,
    });
    const id = userResultSchema.parse(created.json()).user.id;

    const response = await app.inject({
      method: "PATCH",
      url: userByIdPath(id),
      headers: { authorization: `Bearer ${token}` },
      payload: {
        username: "judge01",
      },
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it("returns 400 for invalid user id and 404 for missing user", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const invalidId = await app.inject({
      method: "PATCH",
      url: "/api/users/not-a-number",
      headers: { authorization: `Bearer ${token}` },
      payload: { nickname: "新昵称" },
    });
    const missingUser = await app.inject({
      method: "PATCH",
      url: userByIdPath(999),
      headers: { authorization: `Bearer ${token}` },
      payload: { nickname: "新昵称" },
    });

    expect(invalidId.statusCode).toBe(400);
    expect(missingUser.statusCode).toBe(404);
    await app.close();
  });

  it("resets password and invalidates old token", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const created = await createUser(app, token, {
      username: "judge01",
      password: "secret123",
      roles: judgeRole,
    });
    const judge = userResultSchema.parse(created.json()).user;
    const oldToken = await login(app, "judge01");

    const reset = await app.inject({
      method: "POST",
      url: userResetPasswordPath(judge.id),
      headers: { authorization: `Bearer ${token}` },
      payload: resetUserPasswordInputSchema.parse({
        password: "newSecret123",
      }),
    });

    expect(reset.statusCode).toBe(200);
    expect(userResultSchema.parse(reset.json()).user.authVersion).toBe(1);

    const me = await app.inject({
      method: "GET",
      url: authMePath,
      headers: { authorization: `Bearer ${oldToken}` },
    });
    expect(me.statusCode).toBe(401);

    const oldPasswordLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "judge01",
        password: "secret123",
      },
    });
    const newPasswordLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "judge01",
        password: "newSecret123",
      },
    });

    expect(oldPasswordLogin.statusCode).toBe(401);
    expect(newPasswordLogin.statusCode).toBe(200);
    await app.close();
  });

  it("returns 404 when resetting password for missing user", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const response = await app.inject({
      method: "POST",
      url: userResetPasswordPath(999),
      headers: { authorization: `Bearer ${token}` },
      payload: {
        password: "newSecret123",
      },
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("keeps backend as final gate even for super-admin-role payload from non-super-admin", async () => {
    const { app } = createTestApp();
    const superToken = await bootstrapToken(app);
    await createUser(app, superToken, {
      username: "admin01",
      password: "secret123",
      roles: adminRole,
    });
    const adminToken = await login(app, "admin01");

    const response = await createUser(app, adminToken, {
      username: "hacker01",
      password: "secret123",
      roles: superAdminRole,
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });
});
