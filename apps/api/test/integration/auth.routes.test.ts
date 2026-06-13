import { describe, expect, it } from "vitest";
import { superAdminRole } from "@bjcp-arena/contracts";
import {
  createMemoryAuthUserSnapshotStore,
  type AuthUserSnapshotStore,
} from "../../src/auth/auth-user-snapshot-store.js";
import { createApp } from "../../src/app.js";
import {
  createMemoryUserRepository,
  DuplicateUsernameError,
  type UserRepository,
} from "../../src/users/user-repository.js";
import type { StoredUser } from "../../src/users/user-mapper.js";
import { createTestApp } from "../helpers/create-test-app.js";

function createDuplicateBootstrapUserRepository(): UserRepository {
  return {
    async countUsers() {
      return 0;
    },
    async findById() {
      return null;
    },
    async findByUsername() {
      return null;
    },
    async listUsers() {
      return [];
    },
    async createUser() {
      throw new DuplicateUsernameError();
    },
    async updateUser() {
      return null;
    },
    async resetPassword() {
      return null;
    },
  };
}

function createUnavailableAuthUserSnapshotStore(): AuthUserSnapshotStore {
  return {
    async get() {
      throw new Error("auth user snapshot store unavailable");
    },
    async set() {},
    async delete() {},
    async close() {},
  };
}

function createCountingUserRepository(initialUsers: StoredUser[] = []) {
  const repository = createMemoryUserRepository(initialUsers);
  const calls = {
    findById: 0,
  };

  return {
    calls,
    repository: {
      ...repository,
      async findById(id: number) {
        calls.findById += 1;
        return repository.findById(id);
      },
    } satisfies UserRepository,
  };
}

describe("auth routes", () => {
  it("returns bootstrap status before users exist", async () => {
    const { app } = createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/bootstrap-status",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ hasUsers: false });
    await app.close();
  });

  it("bootstraps fixed superadmin when user table is empty", async () => {
    const { app } = createTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: {
        password: "secret123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      token: expect.any(String),
      user: {
        id: 1,
        username: "superadmin",
        nickname: "superadmin",
        roles: superAdminRole,
        disabled: false,
        authVersion: 0,
      },
    });
    await app.close();
  });

  it("rejects repeated bootstrap after users exist", async () => {
    const { app } = createTestApp();

    await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it("maps duplicate superadmin bootstrap race to conflict", async () => {
    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
      users: createDuplicateBootstrapUserRepository(),
      authUserSnapshots: createMemoryAuthUserSnapshotStore(),
      jwtSecret: "test-secret",
      jwtExpiresIn: "7d",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it("logs in with username and password", async () => {
    const { app } = createTestApp();
    await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "superadmin",
        password: "secret123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      token: expect.any(String),
      user: {
        username: "superadmin",
      },
    });
    await app.close();
  });

  it("rejects invalid password", async () => {
    const { app } = createTestApp();
    await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "superadmin",
        password: "wrong123",
      },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns current user with valid token", async () => {
    const { app } = createTestApp();
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        username: "superadmin",
      },
    });
    await app.close();
  });

  it("uses cached auth user snapshot without reloading the user from DB", async () => {
    const { calls, repository } = createCountingUserRepository();
    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
      users: repository,
      authUserSnapshots: createMemoryAuthUserSnapshotStore(),
      jwtSecret: "test-secret",
      jwtExpiresIn: "7d",
    });
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        username: "superadmin",
        roles: superAdminRole,
      },
    });
    expect(calls.findById).toBe(0);
    await app.close();
  });

  it("rejects token when cached auth user snapshot is stale", async () => {
    const { app, users, authUserSnapshots } = createTestApp();
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;
    const user = await users.findByUsername("superadmin");
    await authUserSnapshots.set({
      id: user!.id,
      username: user!.username,
      nickname: user!.nickname,
      roles: user!.roles,
      disabled: user!.disabled,
      authVersion: user!.authVersion + 1,
      createdAt: user!.createdAt.toISOString(),
      updatedAt: user!.updatedAt.toISOString(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("does not mask auth user snapshot store failures as unauthorized", async () => {
    const dependencies = createTestApp();
    const bootstrap = await dependencies.app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;
    await dependencies.app.close();

    const app = createApp({
      allowedOrigins: ["http://localhost:5173"],
      users: dependencies.users,
      authUserSnapshots: createUnavailableAuthUserSnapshotStore(),
      jwtSecret: "test-secret",
      jwtExpiresIn: "7d",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().message).not.toBe("Unauthorized");
    await app.close();
  });

  it("reloads auth user snapshot from DB when cache misses", async () => {
    const { app, users, authUserSnapshots } = createTestApp();
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;
    const user = await users.findByUsername("superadmin");
    await authUserSnapshots.delete(user!.id);

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(await authUserSnapshots.get(user!.id)).toMatchObject({
      id: user!.id,
      username: "superadmin",
      authVersion: user!.authVersion,
    });
    await app.close();
  });

  it("rejects disabled cached auth user snapshots", async () => {
    const { app, users, authUserSnapshots } = createTestApp();
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;
    const user = await users.findByUsername("superadmin");
    await authUserSnapshots.set({
      id: user!.id,
      username: user!.username,
      nickname: user!.nickname,
      roles: user!.roles,
      disabled: true,
      authVersion: user!.authVersion,
      createdAt: user!.createdAt.toISOString(),
      updatedAt: user!.updatedAt.toISOString(),
    });

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(me.statusCode).toBe(401);
    await app.close();
  });

  it("rejects disabled users during login and DB fallback authenticate", async () => {
    const { app, users, authUserSnapshots } = createTestApp();
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;
    const user = await users.findByUsername("superadmin");
    await users.updateUser(user!.id, { disabled: true });
    await authUserSnapshots.delete(user!.id);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "superadmin",
        password: "secret123",
      },
    });
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(login.statusCode).toBe(401);
    expect(me.statusCode).toBe(401);
    await app.close();
  });
});
