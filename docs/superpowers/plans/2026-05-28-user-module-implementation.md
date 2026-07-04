# 注记：大屏端已暂停并从当前代码中移除；以下为历史实施记录，保留原始上下文。

# 基础用户模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现基础用户模块：Prisma 用户表、JWT 登录、Redis `authVersion` 吊销、后台账号管理、裁判端登录用户信息展示。

**Architecture:** 先在 `packages/contracts` 固化角色、auth、users 契约，再扩展框架无关 `api-client`。API 通过轻量 repository/service/route 分层实现，测试使用内存 repository 和 authVersion store，生产使用 Prisma + Redis。后台使用 `react-router-dom` 做页面级拦截，裁判端保持轻量登录和用户信息页。

**Tech Stack:** pnpm monorepo, TypeScript, Zod, Fastify, Prisma, PostgreSQL, jose JWT, argon2, ioredis, React, Vite, react-router-dom, Vitest.

---

## 执行说明

- 本计划只定义实施步骤；除非用户明确要求，不自动执行 `git commit`。
- 每个任务的 commit step 是检查点建议，提交信息必须使用中文 Conventional Commits。
- 自动化测试仍聚焦 API、contracts、api-client；前端只做 typecheck/build 和人工 smoke。
- 若依赖安装因为网络或 sandbox 失败，按工具规则重新请求授权执行对应 `pnpm add` 或 `pnpm install`。

## 文件结构

### 新建或修改的共享契约

- Modify: `packages/contracts/src/index.ts`：导出 auth/users/roles。
- Create: `packages/contracts/src/roles.ts`：角色 bitmask 常量和判断函数。
- Create: `packages/contracts/src/auth.ts`：登录、bootstrap、me、logout 契约。
- Create: `packages/contracts/src/users.ts`：用户管理路径、schema、类型。
- Create: `packages/contracts/test/auth.test.ts`：auth 契约测试。
- Create: `packages/contracts/test/users.test.ts`：users 契约测试。
- Create: `packages/contracts/test/roles.test.ts`：角色 bitmask 测试。

### 新建或修改的 API Client

- Modify: `packages/api-client/src/create-client.ts`：支持 token provider、GET/POST/PATCH、auth/users 方法。
- Modify: `packages/api-client/test/create-client.test.ts`：覆盖公开请求、认证请求和错误响应。

### 新建或修改的 API

- Modify: `apps/api/package.json`：新增 Prisma/JWT/Redis/密码依赖和 Prisma scripts。
- Create: `apps/api/prisma/schema.prisma`：定义 `User` model。
- Create: `apps/api/prisma/migrations/0001_create_users/migration.sql`：初始 users 表迁移。
- Modify: `apps/api/src/config.ts`：新增 DB、Redis、JWT 配置。
- Create: `apps/api/src/db/prisma.ts`：生产 Prisma client。
- Create: `apps/api/src/auth/password.ts`：argon2 哈希和校验。
- Create: `apps/api/src/auth/token.ts`：JWT 签发和校验。
- Create: `apps/api/src/auth/auth-version-store.ts`：Redis authVersion store 与内存实现。
- Create: `apps/api/src/users/user-repository.ts`：repository interface、Prisma 实现、内存测试实现。
- Create: `apps/api/src/users/user-mapper.ts`：DB user 到 contract user 的转换。
- Create: `apps/api/src/auth/auth-service.ts`：bootstrap、login、me 鉴权逻辑。
- Create: `apps/api/src/routes/auth.routes.ts`：auth 路由。
- Create: `apps/api/src/routes/users.routes.ts`：users 路由。
- Modify: `apps/api/src/app.ts`：注册新路由并注入依赖。
- Create: `apps/api/test/helpers/create-test-app.ts`：集成测试 helper。
- Create: `apps/api/test/integration/auth.routes.test.ts`：auth 路由测试。
- Create: `apps/api/test/integration/users.routes.test.ts`：用户管理测试。

### 新建或修改的前端

- Modify: `apps/admin/package.json`：新增 `react-router-dom`。
- Replace: `apps/admin/src/main.tsx`：后台路由、初始化、登录、布局、用户管理页。
- Replace: `apps/admin/src/styles.css`：后台 B 端布局样式。
- Replace: `apps/judge/src/main.tsx`：裁判端登录和当前用户页。
- Replace: `apps/judge/src/styles.css`：裁判端移动优先样式。

### 文档

- Modify: `docs/local-dev.md`：补充 DB/JWT/Redis 环境变量和初始化流程。
- Modify: `docs/testing.md`：补充用户模块测试边界和人工 smoke。
- Modify: `docs/architecture.md`：补充认证与账号管理数据流。

---

### Task 1: 安装依赖与 Prisma 基础结构

**Files:**

- Modify: `apps/api/package.json`
- Modify: `apps/admin/package.json`
- Modify: `package.json`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/0001_create_users/migration.sql`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: 安装 API 依赖**

Run:

```bash
pnpm --filter @bjcp-arena/api add @prisma/client argon2 ioredis jose
pnpm --filter @bjcp-arena/api add -D prisma
```

Expected: `apps/api/package.json` 增加运行时依赖和 `prisma` devDependency，`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 安装后台路由依赖**

Run:

```bash
pnpm --filter @bjcp-arena/admin add react-router-dom
```

Expected: `apps/admin/package.json` 增加 `react-router-dom`，`pnpm-lock.yaml` 更新。

- [ ] **Step 3: 添加 Prisma scripts**

Edit `apps/api/package.json` scripts to include:

```json
{
  "db:generate": "prisma generate --schema prisma/schema.prisma",
  "db:migrate": "prisma migrate dev --schema prisma/schema.prisma",
  "db:deploy": "prisma migrate deploy --schema prisma/schema.prisma"
}
```

Keep existing scripts unchanged.

- [ ] **Step 4: 创建 Prisma schema**

Create `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  nickname     String
  passwordHash String   @map("password_hash")
  roles        Int
  disabled     Boolean  @default(false)
  authVersion  Int      @default(0) @map("auth_version")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

- [ ] **Step 5: 创建初始迁移 SQL**

Create `apps/api/prisma/migrations/0001_create_users/migration.sql`:

```sql
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "nickname" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "roles" INTEGER NOT NULL,
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "auth_version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "users_roles_idx" ON "users"("roles");
CREATE INDEX "users_disabled_idx" ON "users"("disabled");
```

- [ ] **Step 6: 生成 Prisma client**

Run:

```bash
pnpm --filter @bjcp-arena/api db:generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 7: 验证 API 包类型检查**

Run:

```bash
pnpm --filter @bjcp-arena/api typecheck
```

Expected: PASS.

- [ ] **Step 8: 提交检查点**

Only if user asked to commit:

```bash
git add apps/api/package.json apps/admin/package.json apps/api/prisma pnpm-lock.yaml
git commit -m "chore(api): 添加用户模块基础依赖"
```

---

### Task 2: 定义 roles/auth/users 共享契约

**Files:**

- Create: `packages/contracts/src/roles.ts`
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/contracts/src/users.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/test/roles.test.ts`
- Create: `packages/contracts/test/auth.test.ts`
- Create: `packages/contracts/test/users.test.ts`

- [ ] **Step 1: 先写角色契约测试**

Create `packages/contracts/test/roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  adminRole,
  judgeRole,
  roleLabels,
  superAdminRole,
  userRoleSchema,
  userRolesSchema,
  hasRole,
} from "../src/index.js";

describe("role contract", () => {
  it("defines stable bitmask values", () => {
    expect(superAdminRole).toBe(1);
    expect(adminRole).toBe(2);
    expect(judgeRole).toBe(4);
  });

  it("checks bitmask membership", () => {
    const roles = adminRole | judgeRole;

    expect(hasRole(roles, adminRole)).toBe(true);
    expect(hasRole(roles, judgeRole)).toBe(true);
    expect(hasRole(roles, superAdminRole)).toBe(false);
  });

  it("parses supported single roles and combined roles", () => {
    expect(userRoleSchema.parse(judgeRole)).toBe(judgeRole);
    expect(userRolesSchema.parse(adminRole | judgeRole)).toBe(adminRole | judgeRole);
  });

  it("exposes Chinese labels for UI display", () => {
    expect(roleLabels[superAdminRole]).toBe("超级管理员");
    expect(roleLabels[adminRole]).toBe("赛事管理员");
    expect(roleLabels[judgeRole]).toBe("裁判员");
  });
});
```

- [ ] **Step 2: 运行角色测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/contracts test -- roles.test.ts
```

Expected: FAIL because `roles.ts` exports do not exist.

- [ ] **Step 3: 实现角色契约**

Create `packages/contracts/src/roles.ts`:

```ts
import { z } from "zod";

export const superAdminRole = 1 as const;
export const adminRole = 2 as const;
export const judgeRole = 4 as const;

export const userRoleValues = [superAdminRole, adminRole, judgeRole] as const;

export const roleLabels: Record<(typeof userRoleValues)[number], string> = {
  [superAdminRole]: "超级管理员",
  [adminRole]: "赛事管理员",
  [judgeRole]: "裁判员",
};

export const userRoleSchema = z.union([
  z.literal(superAdminRole),
  z.literal(adminRole),
  z.literal(judgeRole),
]);

export const userRolesSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((roles) => roles > 0, "At least one role is required")
  .refine((roles) => (roles & ~(superAdminRole | adminRole | judgeRole)) === 0, "Unknown role bit");

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserRoles = z.infer<typeof userRolesSchema>;

export function hasRole(roles: number, role: UserRole) {
  return (roles & role) === role;
}

export function canAccessAdminApp(roles: number) {
  return hasRole(roles, superAdminRole) || hasRole(roles, adminRole);
}

export function canManageUsers(roles: number) {
  return hasRole(roles, superAdminRole);
}

export function canAccessJudgeApp(roles: number) {
  return hasRole(roles, judgeRole);
}
```

- [ ] **Step 4: 写 auth 契约测试**

Create `packages/contracts/test/auth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  loginInputSchema,
  userPublicSchema,
  superAdminRole,
} from "../src/index.js";

describe("auth contract", () => {
  it("defines auth endpoint paths", () => {
    expect(authBootstrapStatusPath).toBe("/api/auth/bootstrap-status");
    expect(authBootstrapSuperAdminPath).toBe("/api/auth/bootstrap-super-admin");
    expect(authLoginPath).toBe("/api/auth/login");
    expect(authMePath).toBe("/api/auth/me");
    expect(authLogoutPath).toBe("/api/auth/logout");
  });

  it("parses bootstrap status", () => {
    expect(bootstrapStatusResultSchema.parse({ hasUsers: false })).toEqual({ hasUsers: false });
  });

  it("requires password for bootstrap", () => {
    expect(bootstrapSuperAdminInputSchema.parse({ password: "secret123" })).toEqual({
      password: "secret123",
    });
    expect(() => bootstrapSuperAdminInputSchema.parse({ password: "123" })).toThrow();
  });

  it("requires username and password for login", () => {
    expect(loginInputSchema.parse({ username: "abc123", password: "secret123" })).toEqual({
      username: "abc123",
      password: "secret123",
    });
  });

  it("parses public user and auth session", () => {
    const user = userPublicSchema.parse({
      id: 1,
      username: "superadmin",
      nickname: "superadmin",
      roles: superAdminRole,
      disabled: false,
      authVersion: 0,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(authSessionSchema.parse({ token: "jwt-token", user })).toEqual({
      token: "jwt-token",
      user,
    });
  });
});
```

- [ ] **Step 5: 写 users 契约测试**

Create `packages/contracts/test/users.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  adminRole,
  createUserInputSchema,
  judgeRole,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
  userListResultSchema,
  usersPath,
  userByIdPath,
  userResetPasswordPath,
} from "../src/index.js";

describe("users contract", () => {
  it("defines user management paths", () => {
    expect(usersPath).toBe("/api/users");
    expect(userByIdPath(12)).toBe("/api/users/12");
    expect(userResetPasswordPath(12)).toBe("/api/users/12/reset-password");
  });

  it("parses create user input with optional username and nickname", () => {
    expect(
      createUserInputSchema.parse({
        password: "secret123",
        roles: adminRole | judgeRole,
      })
    ).toEqual({
      password: "secret123",
      roles: adminRole | judgeRole,
    });
  });

  it("rejects non-alphanumeric username", () => {
    expect(() =>
      createUserInputSchema.parse({
        username: "bad_name",
        password: "secret123",
        roles: adminRole,
      })
    ).toThrow();
  });

  it("parses update user input", () => {
    expect(
      updateUserInputSchema.parse({
        username: "abc123",
        nickname: "BJCP Admin",
        roles: adminRole,
        disabled: true,
      })
    ).toEqual({
      username: "abc123",
      nickname: "BJCP Admin",
      roles: adminRole,
      disabled: true,
    });
  });

  it("parses reset password input", () => {
    expect(resetUserPasswordInputSchema.parse({ password: "newSecret123" })).toEqual({
      password: "newSecret123",
    });
  });

  it("parses user list result", () => {
    expect(
      userListResultSchema.parse({
        users: [
          {
            id: 1,
            username: "abc123",
            nickname: "bjcp_abc123",
            roles: judgeRole,
            disabled: false,
            authVersion: 0,
            createdAt: "2026-05-28T00:00:00.000Z",
            updatedAt: "2026-05-28T00:00:00.000Z",
          },
        ],
      })
    ).toHaveProperty("users.length", 1);
  });
});
```

- [ ] **Step 6: 运行契约测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/contracts test
```

Expected: FAIL because auth/users exports do not exist.

- [ ] **Step 7: 实现 auth 契约**

Create `packages/contracts/src/auth.ts`:

```ts
import { z } from "zod";
import { userRolesSchema } from "./roles.js";

export const authBootstrapStatusPath = "/api/auth/bootstrap-status" as const;
export const authBootstrapSuperAdminPath = "/api/auth/bootstrap-super-admin" as const;
export const authLoginPath = "/api/auth/login" as const;
export const authMePath = "/api/auth/me" as const;
export const authLogoutPath = "/api/auth/logout" as const;

export const passwordSchema = z.string().min(6).max(128);
export const usernameSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9]+$/);

export const userPublicSchema = z.object({
  id: z.number().int().positive(),
  username: usernameSchema,
  nickname: z.string().min(1).max(64),
  roles: userRolesSchema,
  disabled: z.boolean(),
  authVersion: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const bootstrapStatusResultSchema = z.object({
  hasUsers: z.boolean(),
});

export const bootstrapSuperAdminInputSchema = z.object({
  password: passwordSchema,
});

export const loginInputSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const authSessionSchema = z.object({
  token: z.string().min(1),
  user: userPublicSchema,
});

export const logoutResultSchema = z.object({
  ok: z.literal(true),
});

export type UserPublic = z.infer<typeof userPublicSchema>;
export type BootstrapStatusResult = z.infer<typeof bootstrapStatusResultSchema>;
export type BootstrapSuperAdminInput = z.infer<typeof bootstrapSuperAdminInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LogoutResult = z.infer<typeof logoutResultSchema>;
```

- [ ] **Step 8: 实现 users 契约**

Create `packages/contracts/src/users.ts`:

```ts
import { z } from "zod";
import { passwordSchema, userPublicSchema, usernameSchema } from "./auth.js";
import { userRolesSchema } from "./roles.js";

export const usersPath = "/api/users" as const;

export function userByIdPath(id: number) {
  return `/api/users/${id}` as const;
}

export function userResetPasswordPath(id: number) {
  return `/api/users/${id}/reset-password` as const;
}

export const createUserInputSchema = z.object({
  username: usernameSchema.optional(),
  nickname: z.string().min(1).max(64).optional(),
  password: passwordSchema,
  roles: userRolesSchema,
});

export const updateUserInputSchema = z
  .object({
    username: usernameSchema.optional(),
    nickname: z.string().min(1).max(64).optional(),
    roles: userRolesSchema.optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const resetUserPasswordInputSchema = z.object({
  password: passwordSchema,
});

export const userListResultSchema = z.object({
  users: z.array(userPublicSchema),
});

export const userResultSchema = z.object({
  user: userPublicSchema,
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordInputSchema>;
export type UserListResult = z.infer<typeof userListResultSchema>;
export type UserResult = z.infer<typeof userResultSchema>;
```

- [ ] **Step 9: 导出新契约**

Modify `packages/contracts/src/index.ts`:

```ts
export * from "./ping.js";
export * from "./roles.js";
export * from "./auth.js";
export * from "./users.js";
```

- [ ] **Step 10: 运行契约测试确认通过**

Run:

```bash
pnpm --filter @bjcp-arena/contracts test
```

Expected: PASS.

- [ ] **Step 11: 提交检查点**

Only if user asked to commit:

```bash
git add packages/contracts/src packages/contracts/test
git commit -m "feat(contracts): 添加用户认证契约"
```

---

### Task 3: 扩展 API Client

**Files:**

- Modify: `packages/api-client/src/create-client.ts`
- Modify: `packages/api-client/test/create-client.test.ts`

- [ ] **Step 1: 写 API Client 认证请求测试**

Replace `packages/api-client/test/create-client.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { createApiClient, type FetchLike } from "../src/index.js";
import { adminRole, judgeRole } from "@bjcp-arena/contracts";

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
  nickname: "bjcp_abc123",
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

  it("calls public auth endpoints without authorization", async () => {
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

  it("adds bearer token for authenticated endpoints", async () => {
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

  it("supports user management requests", async () => {
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
        jsonResponse({
          message: "ok",
          service: "bjcp-arena-api",
        }),
    });

    await expect(client.ping()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 运行 API Client 测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/api-client test
```

Expected: FAIL because new client methods do not exist.

- [ ] **Step 3: 实现 API Client**

Replace `packages/api-client/src/create-client.ts` with:

```ts
import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  bootstrapStatusResultSchema,
  logoutResultSchema,
  pingPath,
  pingResultSchema,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
  userByIdPath,
  userListResultSchema,
  userResetPasswordPath,
  userResultSchema,
  usersPath,
  createUserInputSchema,
  type AuthSession,
  type BootstrapStatusResult,
  type BootstrapSuperAdminInput,
  type CreateUserInput,
  type LoginInput,
  type LogoutResult,
  type PingResult,
  type ResetUserPasswordInput,
  type UpdateUserInput,
  type UserListResult,
  type UserResult,
} from "@bjcp-arena/contracts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  getToken?: () => string | null | undefined;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function buildHeaders(authenticated: boolean, token: string | null | undefined, hasBody: boolean) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (authenticated && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function requestJson<TResponse>(
  fetcher: FetchLike,
  baseUrl: string,
  method: "GET" | "POST" | "PATCH",
  path: string,
  parse: (data: unknown) => TResponse,
  options: {
    body?: unknown;
    authenticated?: boolean;
    token?: string | null | undefined;
  } = {}
) {
  const hasBody = options.body !== undefined;
  const response = await fetcher(joinUrl(baseUrl, path), {
    method,
    headers: buildHeaders(options.authenticated === true, options.token, hasBody),
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    throw new Error(`${method} ${path} failed with status ${response.status}`);
  }

  return parse(await response.json());
}

export function createApiClient(options: CreateApiClientOptions) {
  const fetcher = options.fetch ?? fetch;
  const token = () => options.getToken?.();

  return {
    ping(): Promise<PingResult> {
      return requestJson(fetcher, options.baseUrl, "GET", pingPath, (data) =>
        pingResultSchema.parse(data)
      );
    },

    getBootstrapStatus(): Promise<BootstrapStatusResult> {
      return requestJson(fetcher, options.baseUrl, "GET", authBootstrapStatusPath, (data) =>
        bootstrapStatusResultSchema.parse(data)
      );
    },

    bootstrapSuperAdmin(input: BootstrapSuperAdminInput): Promise<AuthSession> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        authBootstrapSuperAdminPath,
        (data) => authSessionSchema.parse(data),
        { body: input }
      );
    },

    login(input: LoginInput): Promise<AuthSession> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        authLoginPath,
        (data) => authSessionSchema.parse(data),
        { body: input }
      );
    },

    me(): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        authMePath,
        (data) => userResultSchema.parse(data),
        { authenticated: true, token: token() }
      );
    },

    logout(): Promise<LogoutResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        authLogoutPath,
        (data) => logoutResultSchema.parse(data),
        { authenticated: true, token: token() }
      );
    },

    listUsers(): Promise<UserListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        usersPath,
        (data) => userListResultSchema.parse(data),
        { authenticated: true, token: token() }
      );
    },

    createUser(input: CreateUserInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        usersPath,
        (data) => userResultSchema.parse(data),
        { body: createUserInputSchema.parse(input), authenticated: true, token: token() }
      );
    },

    updateUser(id: number, input: UpdateUserInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        userByIdPath(id),
        (data) => userResultSchema.parse(data),
        { body: updateUserInputSchema.parse(input), authenticated: true, token: token() }
      );
    },

    resetUserPassword(id: number, input: ResetUserPasswordInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        userResetPasswordPath(id),
        (data) => userResultSchema.parse(data),
        { body: resetUserPasswordInputSchema.parse(input), authenticated: true, token: token() }
      );
    },
  };
}
```

- [ ] **Step 4: 运行 API Client 测试确认通过**

Run:

```bash
pnpm --filter @bjcp-arena/api-client test
```

Expected: PASS.

- [ ] **Step 5: 提交检查点**

Only if user asked to commit:

```bash
git add packages/api-client/src packages/api-client/test
git commit -m "feat(api-client): 支持认证和用户管理接口"
```

---

### Task 4: API 配置、密码、JWT 和 authVersion 基础工具

**Files:**

- Modify: `apps/api/src/config.ts`
- Create: `apps/api/src/auth/password.ts`
- Create: `apps/api/src/auth/token.ts`
- Create: `apps/api/src/auth/auth-version-store.ts`
- Create: `apps/api/test/unit/auth-token.test.ts`

- [ ] **Step 1: 写 token 单元测试**

Create `apps/api/test/unit/auth-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminRole } from "@bjcp-arena/contracts";
import { createTokenService } from "../../src/auth/token.js";

describe("createTokenService", () => {
  it("signs and verifies auth token payload", async () => {
    const service = createTokenService({
      jwtSecret: "test-secret",
      jwtExpiresIn: "7d",
    });

    const token = await service.sign({
      userId: 1,
      username: "abc123",
      roles: adminRole,
      authVersion: 0,
    });

    await expect(service.verify(token)).resolves.toMatchObject({
      userId: 1,
      username: "abc123",
      roles: adminRole,
      authVersion: 0,
    });
  });
});
```

- [ ] **Step 2: 运行 token 测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- auth-token.test.ts
```

Expected: FAIL because `src/auth/token.ts` does not exist.

- [ ] **Step 3: 扩展 API 配置**

Modify `apps/api/src/config.ts`:

```ts
import "dotenv/config";

export const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

export interface ApiConfig {
  host: string;
  port: number;
  allowedOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

function readCsv(value: string | undefined) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function getApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    host: env.API_HOST ?? "0.0.0.0",
    port: Number(env.API_PORT ?? 4000),
    allowedOrigins: readCsv(env.API_ALLOWED_ORIGINS) ?? defaultAllowedOrigins,
    databaseUrl:
      env.DATABASE_URL ?? "postgresql://bjcp_arena:bjcp_arena@127.0.0.1:25432/bjcp_arena",
    redisUrl: env.REDIS_URL ?? "redis://127.0.0.1:26379",
    jwtSecret: env.JWT_SECRET ?? "local-development-secret-change-me",
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? "7d",
  };
}
```

- [ ] **Step 4: 实现密码工具**

Create `apps/api/src/auth/password.ts`:

```ts
import argon2 from "argon2";

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
```

- [ ] **Step 5: 实现 JWT 工具**

Create `apps/api/src/auth/token.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

export interface TokenConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface AuthTokenPayload {
  userId: number;
  username: string;
  roles: number;
  authVersion: number;
}

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export function createTokenService(config: TokenConfig) {
  const key = secretKey(config.jwtSecret);

  return {
    async sign(payload: AuthTokenPayload) {
      return new SignJWT({
        username: payload.username,
        roles: payload.roles,
        authVersion: payload.authVersion,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(payload.userId))
        .setIssuedAt()
        .setExpirationTime(config.jwtExpiresIn)
        .sign(key);
    },

    async verify(token: string): Promise<AuthTokenPayload> {
      const result = await jwtVerify(token, key);
      const subject = result.payload.sub;

      if (!subject) {
        throw new Error("JWT subject is missing");
      }

      return {
        userId: Number(subject),
        username: String(result.payload.username),
        roles: Number(result.payload.roles),
        authVersion: Number(result.payload.authVersion),
      };
    },
  };
}
```

- [ ] **Step 6: 实现 authVersion store**

Create `apps/api/src/auth/auth-version-store.ts`:

```ts
import Redis from "ioredis";

export interface AuthVersionStore {
  get(userId: number): Promise<number | null>;
  set(userId: number, authVersion: number): Promise<void>;
  close(): Promise<void>;
}

function keyFor(userId: number) {
  return `auth-version:${userId}`;
}

export function createRedisAuthVersionStore(redisUrl: string): AuthVersionStore {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
  });

  return {
    async get(userId: number) {
      if (redis.status === "wait") {
        await redis.connect();
      }
      const value = await redis.get(keyFor(userId));
      return value === null ? null : Number(value);
    },

    async set(userId: number, authVersion: number) {
      if (redis.status === "wait") {
        await redis.connect();
      }
      await redis.set(keyFor(userId), String(authVersion));
    },

    async close() {
      redis.disconnect();
    },
  };
}

export function createMemoryAuthVersionStore(
  initial: Record<number, number> = {}
): AuthVersionStore {
  const values = new Map<number, number>(
    Object.entries(initial).map(([userId, authVersion]) => [Number(userId), authVersion])
  );

  return {
    async get(userId: number) {
      return values.get(userId) ?? null;
    },

    async set(userId: number, authVersion: number) {
      values.set(userId, authVersion);
    },

    async close() {
      values.clear();
    },
  };
}
```

- [ ] **Step 7: 运行 token 测试确认通过**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- auth-token.test.ts
```

Expected: PASS.

- [ ] **Step 8: 提交检查点**

Only if user asked to commit:

```bash
git add apps/api/src/config.ts apps/api/src/auth apps/api/test/unit
git commit -m "feat(api): 添加认证基础工具"
```

---

### Task 5: 用户 Repository、Mapper 和随机账号工具

**Files:**

- Create: `apps/api/src/db/prisma.ts`
- Create: `apps/api/src/users/user-repository.ts`
- Create: `apps/api/src/users/user-mapper.ts`
- Create: `apps/api/src/users/random-user.ts`
- Create: `apps/api/test/unit/random-user.test.ts`

- [ ] **Step 1: 写随机账号测试**

Create `apps/api/test/unit/random-user.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRandomNickname, createRandomUsername } from "../../src/users/random-user.js";

describe("random user helpers", () => {
  it("creates 6-character alphanumeric username", () => {
    const username = createRandomUsername();

    expect(username).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it("creates bjcp nickname with 6-character suffix", () => {
    const nickname = createRandomNickname();

    expect(nickname).toMatch(/^bjcp_[A-Za-z0-9]{6}$/);
  });
});
```

- [ ] **Step 2: 运行随机账号测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- random-user.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: 实现随机账号工具**

Create `apps/api/src/users/random-user.ts`:

```ts
import { randomInt } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function createRandomUsername() {
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export function createRandomNickname() {
  return `bjcp_${createRandomUsername()}`;
}
```

- [ ] **Step 4: 实现 Prisma client**

Create `apps/api/src/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 5: 实现 user mapper**

Create `apps/api/src/users/user-mapper.ts`:

```ts
import type { UserPublic } from "@bjcp-arena/contracts";

export interface StoredUser {
  id: number;
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
  disabled: boolean;
  authVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(user: StoredUser): UserPublic {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    roles: user.roles,
    disabled: user.disabled,
    authVersion: user.authVersion,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 6: 实现 repository 接口、Prisma 实现、内存实现**

Create `apps/api/src/users/user-repository.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import type { StoredUser } from "./user-mapper.js";

export interface CreateStoredUserInput {
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
}

export interface UpdateStoredUserInput {
  username?: string;
  nickname?: string;
  roles?: number;
  disabled?: boolean;
}

export interface UserRepository {
  countUsers(): Promise<number>;
  findById(id: number): Promise<StoredUser | null>;
  findByUsername(username: string): Promise<StoredUser | null>;
  listUsers(): Promise<StoredUser[]>;
  createUser(input: CreateStoredUserInput): Promise<StoredUser>;
  updateUser(id: number, input: UpdateStoredUserInput): Promise<StoredUser | null>;
  resetPassword(id: number, passwordHash: string): Promise<StoredUser | null>;
}

function shouldBumpAuthVersion(input: UpdateStoredUserInput) {
  return input.username !== undefined || input.roles !== undefined || input.disabled !== undefined;
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    countUsers() {
      return prisma.user.count();
    },

    findById(id) {
      return prisma.user.findUnique({ where: { id } });
    },

    findByUsername(username) {
      return prisma.user.findUnique({ where: { username } });
    },

    listUsers() {
      return prisma.user.findMany({
        orderBy: { id: "asc" },
      });
    },

    createUser(input) {
      return prisma.user.create({ data: input });
    },

    updateUser(id, input) {
      return prisma.user
        .update({
          where: { id },
          data: {
            ...input,
            ...(shouldBumpAuthVersion(input) ? { authVersion: { increment: 1 } } : {}),
          },
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.message.includes("Record to update not found")) {
            return null;
          }
          throw error;
        });
    },

    resetPassword(id, passwordHash) {
      return prisma.user
        .update({
          where: { id },
          data: {
            passwordHash,
            authVersion: { increment: 1 },
          },
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.message.includes("Record to update not found")) {
            return null;
          }
          throw error;
        });
    },
  };
}

export function createMemoryUserRepository(initialUsers: StoredUser[] = []): UserRepository {
  const users = new Map<number, StoredUser>(initialUsers.map((user) => [user.id, user]));
  let nextId = initialUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1;

  const now = () => new Date("2026-05-28T00:00:00.000Z");

  return {
    async countUsers() {
      return users.size;
    },

    async findById(id) {
      return users.get(id) ?? null;
    },

    async findByUsername(username) {
      return Array.from(users.values()).find((user) => user.username === username) ?? null;
    },

    async listUsers() {
      return Array.from(users.values()).sort((a, b) => a.id - b.id);
    },

    async createUser(input) {
      if (Array.from(users.values()).some((user) => user.username === input.username)) {
        throw new Error("Username already exists");
      }

      const user: StoredUser = {
        id: nextId,
        username: input.username,
        nickname: input.nickname,
        passwordHash: input.passwordHash,
        roles: input.roles,
        disabled: false,
        authVersion: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      nextId += 1;
      users.set(user.id, user);
      return user;
    },

    async updateUser(id, input) {
      const user = users.get(id);
      if (!user) {
        return null;
      }
      const updated: StoredUser = {
        ...user,
        ...input,
        authVersion: shouldBumpAuthVersion(input) ? user.authVersion + 1 : user.authVersion,
        updatedAt: now(),
      };
      users.set(id, updated);
      return updated;
    },

    async resetPassword(id, passwordHash) {
      const user = users.get(id);
      if (!user) {
        return null;
      }
      const updated: StoredUser = {
        ...user,
        passwordHash,
        authVersion: user.authVersion + 1,
        updatedAt: now(),
      };
      users.set(id, updated);
      return updated;
    },
  };
}
```

- [ ] **Step 7: 运行随机账号测试确认通过**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- random-user.test.ts
```

Expected: PASS.

- [ ] **Step 8: 运行 API 类型检查**

Run:

```bash
pnpm --filter @bjcp-arena/api typecheck
```

Expected: PASS.

- [ ] **Step 9: 提交检查点**

Only if user asked to commit:

```bash
git add apps/api/src/db apps/api/src/users apps/api/test/unit/random-user.test.ts
git commit -m "feat(api): 添加用户仓储基础结构"
```

---

### Task 6: Auth Service 与 Auth 路由

**Files:**

- Create: `apps/api/src/auth/auth-service.ts`
- Create: `apps/api/src/routes/auth.routes.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/test/helpers/create-test-app.ts`
- Create: `apps/api/test/integration/auth.routes.test.ts`

- [ ] **Step 1: 写 auth 路由集成测试**

Create `apps/api/test/integration/auth.routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { superAdminRole } from "@bjcp-arena/contracts";
import { createTestApp } from "../helpers/create-test-app.js";

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

  it("rejects token when authVersion is stale", async () => {
    const { app, users, authVersions } = createTestApp();
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-super-admin",
      payload: { password: "secret123" },
    });
    const token = bootstrap.json().token as string;
    const user = await users.findByUsername("superadmin");
    await authVersions.set(user!.id, user!.authVersion + 1);

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
});
```

- [ ] **Step 2: 运行 auth 路由测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- auth.routes.test.ts
```

Expected: FAIL because test helper and routes do not exist.

- [ ] **Step 3: 实现 Auth Service**

Create `apps/api/src/auth/auth-service.ts`:

```ts
import { superAdminRole } from "@bjcp-arena/contracts";
import type { AuthVersionStore } from "./auth-version-store.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { createTokenService, AuthTokenPayload } from "./token.js";
import type { UserRepository } from "../users/user-repository.js";
import { toPublicUser } from "../users/user-mapper.js";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export interface AuthServiceDependencies {
  users: UserRepository;
  authVersions: AuthVersionStore;
  tokens: ReturnType<typeof createTokenService>;
}

export function createAuthService({ users, authVersions, tokens }: AuthServiceDependencies) {
  async function sessionFor(payload: AuthTokenPayload) {
    const user = await users.findById(payload.userId);
    if (!user || user.disabled) {
      throw new AuthError("Unauthorized", 401);
    }

    const cachedVersion = await authVersions.get(user.id);
    const currentVersion = cachedVersion ?? user.authVersion;
    if (cachedVersion === null) {
      await authVersions.set(user.id, user.authVersion);
    }

    if (payload.authVersion !== currentVersion) {
      throw new AuthError("Unauthorized", 401);
    }

    return user;
  }

  return {
    async bootstrapStatus() {
      return {
        hasUsers: (await users.countUsers()) > 0,
      };
    },

    async bootstrapSuperAdmin(password: string) {
      if ((await users.countUsers()) > 0) {
        throw new AuthError("Users already exist", 409);
      }

      const user = await users.createUser({
        username: "superadmin",
        nickname: "superadmin",
        passwordHash: await hashPassword(password),
        roles: superAdminRole,
      });
      await authVersions.set(user.id, user.authVersion);
      const token = await tokens.sign({
        userId: user.id,
        username: user.username,
        roles: user.roles,
        authVersion: user.authVersion,
      });

      return {
        token,
        user: toPublicUser(user),
      };
    },

    async login(username: string, password: string) {
      const user = await users.findByUsername(username);
      if (!user || user.disabled || !(await verifyPassword(user.passwordHash, password))) {
        throw new AuthError("Invalid username or password", 401);
      }

      await authVersions.set(user.id, user.authVersion);
      const token = await tokens.sign({
        userId: user.id,
        username: user.username,
        roles: user.roles,
        authVersion: user.authVersion,
      });

      return {
        token,
        user: toPublicUser(user),
      };
    },

    async authenticate(authorization: string | undefined) {
      const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) {
        throw new AuthError("Unauthorized", 401);
      }

      const payload = await tokens.verify(token).catch(() => {
        throw new AuthError("Unauthorized", 401);
      });
      return sessionFor(payload);
    },
  };
}
```

- [ ] **Step 4: 实现 Auth 路由**

Create `apps/api/src/routes/auth.routes.ts`:

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  loginInputSchema,
  logoutResultSchema,
  userResultSchema,
} from "@bjcp-arena/contracts";
import type { createAuthService, AuthError } from "../auth/auth-service.js";
import { toPublicUser } from "../users/user-mapper.js";

type AuthService = ReturnType<typeof createAuthService>;

function sendAuthError(reply: FastifyReply, error: unknown) {
  const maybeAuthError = error as AuthError;
  if (typeof maybeAuthError.statusCode === "number") {
    return reply.status(maybeAuthError.statusCode).send({
      message: maybeAuthError.message,
    });
  }
  throw error;
}

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService) {
  app.get(
    authBootstrapStatusPath,
    {
      schema: {
        response: { 200: bootstrapStatusResultSchema },
        summary: "Check whether initial user exists",
        tags: ["auth"],
      },
    },
    async () => auth.bootstrapStatus()
  );

  app.post(
    authBootstrapSuperAdminPath,
    {
      schema: {
        body: bootstrapSuperAdminInputSchema,
        response: { 200: authSessionSchema },
        summary: "Create initial super admin",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      const input = bootstrapSuperAdminInputSchema.parse(request.body);
      return auth
        .bootstrapSuperAdmin(input.password)
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.post(
    authLoginPath,
    {
      schema: {
        body: loginInputSchema,
        response: { 200: authSessionSchema },
        summary: "Login with username and password",
        tags: ["auth"],
      },
    },
    async (request, reply) => {
      const input = loginInputSchema.parse(request.body);
      return auth
        .login(input.username, input.password)
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.get(
    authMePath,
    {
      schema: {
        response: { 200: userResultSchema },
        summary: "Get current user",
        tags: ["auth"],
      },
    },
    async (request: FastifyRequest, reply) => {
      return auth
        .authenticate(request.headers.authorization)
        .then((user) => ({ user: toPublicUser(user) }))
        .catch((error: unknown) => sendAuthError(reply, error));
    }
  );

  app.post(
    authLogoutPath,
    {
      schema: {
        response: { 200: logoutResultSchema },
        summary: "Logout current token on client side",
        tags: ["auth"],
      },
    },
    async () => ({ ok: true as const })
  );
}
```

- [ ] **Step 5: 修改 app 注入依赖并注册 auth 路由**

Modify `apps/api/src/app.ts` to include new dependencies while keeping ping:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { pingPath, pingResultSchema, type PingResult } from "@bjcp-arena/contracts";
import { defaultAllowedOrigins, getApiConfig } from "./config.js";
import {
  createMemoryAuthVersionStore,
  createRedisAuthVersionStore,
  type AuthVersionStore,
} from "./auth/auth-version-store.js";
import { createAuthService } from "./auth/auth-service.js";
import { createTokenService } from "./auth/token.js";
import { prisma } from "./db/prisma.js";
import {
  createMemoryUserRepository,
  createPrismaUserRepository,
  type UserRepository,
} from "./users/user-repository.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";

export interface CreateAppOptions {
  allowedOrigins?: string[];
  users?: UserRepository;
  authVersions?: AuthVersionStore;
  jwtSecret?: string;
  jwtExpiresIn?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });
  const config = getApiConfig();
  const allowedOrigins = options.allowedOrigins ?? defaultAllowedOrigins;
  const users = options.users ?? createPrismaUserRepository(prisma);
  const authVersions = options.authVersions ?? createRedisAuthVersionStore(config.redisUrl);
  const tokens = createTokenService({
    jwtSecret: options.jwtSecret ?? config.jwtSecret,
    jwtExpiresIn: options.jwtExpiresIn ?? config.jwtExpiresIn,
  });
  const auth = createAuthService({ users, authVersions, tokens });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: allowedOrigins,
  });

  app.addHook("onClose", async () => {
    await authVersions.close();
  });

  app.get(
    pingPath,
    {
      schema: {
        response: {
          200: pingResultSchema,
        },
        summary: "Check API reachability",
        tags: ["system"],
      },
    },
    async (): Promise<PingResult> => {
      return {
        message: "pong",
        service: "bjcp-arena-api",
      };
    }
  );

  registerAuthRoutes(app, auth);

  return app;
}

export function createTestDependencies() {
  const users = createMemoryUserRepository();
  const authVersions = createMemoryAuthVersionStore();

  return {
    users,
    authVersions,
  };
}
```

- [ ] **Step 6: 实现测试 helper**

Create `apps/api/test/helpers/create-test-app.ts`:

```ts
import { createApp, createTestDependencies } from "../../src/app.js";

export function createTestApp() {
  const dependencies = createTestDependencies();
  const app = createApp({
    allowedOrigins: ["http://localhost:5173"],
    users: dependencies.users,
    authVersions: dependencies.authVersions,
    jwtSecret: "test-secret",
    jwtExpiresIn: "7d",
  });

  return {
    app,
    users: dependencies.users,
    authVersions: dependencies.authVersions,
  };
}
```

- [ ] **Step 7: 运行 auth 路由测试确认通过**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- auth.routes.test.ts
```

Expected: PASS.

- [ ] **Step 8: 运行原 ping 路由测试确认未回归**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- ping.routes.test.ts
```

Expected: PASS.

- [ ] **Step 9: 提交检查点**

Only if user asked to commit:

```bash
git add apps/api/src apps/api/test
git commit -m "feat(api): 添加登录和超管初始化接口"
```

---

### Task 7: 用户管理 API

**Files:**

- Create: `apps/api/src/routes/users.routes.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/test/integration/users.routes.test.ts`

- [ ] **Step 1: 写用户管理集成测试**

Create `apps/api/test/integration/users.routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminRole, judgeRole, superAdminRole } from "@bjcp-arena/contracts";
import { createTestApp } from "../helpers/create-test-app.js";

async function bootstrapToken(app: ReturnType<typeof createTestApp>["app"]) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/bootstrap-super-admin",
    payload: { password: "secret123" },
  });
  return response.json().token as string;
}

describe("user management routes", () => {
  it("allows super admin to create and list users", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        username: "judge01",
        nickname: "裁判 01",
        password: "secret123",
        roles: judgeRole,
      },
    });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json()).toMatchObject({
      user: {
        username: "judge01",
        nickname: "裁判 01",
        roles: judgeRole,
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().users).toHaveLength(2);
    await app.close();
  });

  it("auto-generates username and nickname when omitted", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        password: "secret123",
        roles: judgeRole,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.username).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(response.json().user.nickname).toMatch(/^bjcp_[A-Za-z0-9]{6}$/);
    await app.close();
  });

  it("rejects non-super-admin user management", async () => {
    const { app } = createTestApp();
    const superToken = await bootstrapToken(app);
    await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${superToken}` },
      payload: {
        username: "admin01",
        password: "secret123",
        roles: adminRole,
      },
    });
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "admin01",
        password: "secret123",
      },
    });
    const adminToken = loginResponse.json().token as string;

    const response = await app.inject({
      method: "GET",
      url: "/api/users",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("updates user and bumps authVersion when roles change", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    const created = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        username: "judge01",
        password: "secret123",
        roles: judgeRole,
      },
    });
    const id = created.json().user.id as number;

    const response = await app.inject({
      method: "PATCH",
      url: `/api/users/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        roles: judgeRole | adminRole,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      roles: judgeRole | adminRole,
      authVersion: 1,
    });
    await app.close();
  });

  it("resets password and invalidates old token", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);
    await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        username: "judge01",
        password: "secret123",
        roles: judgeRole,
      },
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "judge01",
        password: "secret123",
      },
    });
    const oldToken = login.json().token as string;

    const list = await app.inject({
      method: "GET",
      url: "/api/users",
      headers: { authorization: `Bearer ${token}` },
    });
    const judge = list
      .json()
      .users.find((user: { username: string }) => user.username === "judge01");
    const reset = await app.inject({
      method: "POST",
      url: `/api/users/${judge.id}/reset-password`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        password: "newSecret123",
      },
    });

    expect(reset.statusCode).toBe(200);
    expect(reset.json().user.authVersion).toBe(1);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${oldToken}` },
    });
    expect(me.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "judge01",
        password: "newSecret123",
      },
    });
    expect(newLogin.statusCode).toBe(200);
    await app.close();
  });
});
```

- [ ] **Step 2: 运行用户管理测试确认失败**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- users.routes.test.ts
```

Expected: FAIL because users routes are not registered.

- [ ] **Step 3: 实现 users 路由**

Create `apps/api/src/routes/users.routes.ts`:

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  canManageUsers,
  createUserInputSchema,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
  userListResultSchema,
  userResultSchema,
  usersPath,
} from "@bjcp-arena/contracts";
import type { createAuthService, AuthError } from "../auth/auth-service.js";
import { hashPassword } from "../auth/password.js";
import type { AuthVersionStore } from "../auth/auth-version-store.js";
import type { UserRepository } from "../users/user-repository.js";
import { createRandomNickname, createRandomUsername } from "../users/random-user.js";
import { toPublicUser } from "../users/user-mapper.js";

type AuthService = ReturnType<typeof createAuthService>;

function sendError(reply: FastifyReply, error: unknown) {
  const maybeAuthError = error as AuthError;
  if (typeof maybeAuthError.statusCode === "number") {
    return reply.status(maybeAuthError.statusCode).send({
      message: maybeAuthError.message,
    });
  }
  throw error;
}

async function requireSuperAdmin(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if (!canManageUsers(currentUser.roles)) {
    const error = new Error("Forbidden") as AuthError;
    error.statusCode = 403;
    throw error;
  }
  return currentUser;
}

function parseUserId(request: FastifyRequest) {
  const params = request.params as { id?: string };
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("Invalid user id") as AuthError;
    error.statusCode = 400;
    throw error;
  }
  return id;
}

async function syncAuthVersion(
  authVersions: AuthVersionStore,
  userId: number,
  authVersion: number
) {
  await authVersions.set(userId, authVersion);
}

export function registerUserRoutes(
  app: FastifyInstance,
  dependencies: {
    auth: AuthService;
    users: UserRepository;
    authVersions: AuthVersionStore;
  }
) {
  const { auth, users, authVersions } = dependencies;

  app.get(
    usersPath,
    {
      schema: {
        response: { 200: userListResultSchema },
        summary: "List users",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => ({ users: (await users.listUsers()).map(toPublicUser) }))
        .catch((error: unknown) => sendError(reply, error));
    }
  );

  app.post(
    usersPath,
    {
      schema: {
        body: createUserInputSchema,
        response: { 200: userResultSchema },
        summary: "Create user",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const input = createUserInputSchema.parse(request.body);
          const user = await users.createUser({
            username: input.username ?? createRandomUsername(),
            nickname: input.nickname ?? createRandomNickname(),
            passwordHash: await hashPassword(input.password),
            roles: input.roles,
          });
          await syncAuthVersion(authVersions, user.id, user.authVersion);
          return { user: toPublicUser(user) };
        })
        .catch((error: unknown) => sendError(reply, error));
    }
  );

  app.patch(
    "/api/users/:id",
    {
      schema: {
        body: updateUserInputSchema,
        response: { 200: userResultSchema },
        summary: "Update user",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const id = parseUserId(request);
          const input = updateUserInputSchema.parse(request.body);
          const user = await users.updateUser(id, input);
          if (!user) {
            return reply.status(404).send({ message: "User not found" });
          }
          await syncAuthVersion(authVersions, user.id, user.authVersion);
          return { user: toPublicUser(user) };
        })
        .catch((error: unknown) => sendError(reply, error));
    }
  );

  app.post(
    "/api/users/:id/reset-password",
    {
      schema: {
        body: resetUserPasswordInputSchema,
        response: { 200: userResultSchema },
        summary: "Reset user password",
        tags: ["users"],
      },
    },
    async (request, reply) => {
      return requireSuperAdmin(auth, request)
        .then(async () => {
          const id = parseUserId(request);
          const input = resetUserPasswordInputSchema.parse(request.body);
          const user = await users.resetPassword(id, await hashPassword(input.password));
          if (!user) {
            return reply.status(404).send({ message: "User not found" });
          }
          await syncAuthVersion(authVersions, user.id, user.authVersion);
          return { user: toPublicUser(user) };
        })
        .catch((error: unknown) => sendError(reply, error));
    }
  );
}
```

- [ ] **Step 4: 注册 users 路由**

Modify `apps/api/src/app.ts`:

```ts
import { registerUserRoutes } from "./routes/users.routes.js";
```

After `registerAuthRoutes(app, auth);`, add:

```ts
registerUserRoutes(app, {
  auth,
  users,
  authVersions,
});
```

- [ ] **Step 5: 运行用户管理测试确认通过**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- users.routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: 运行 API 全量测试**

Run:

```bash
pnpm --filter @bjcp-arena/api test
```

Expected: PASS.

- [ ] **Step 7: 提交检查点**

Only if user asked to commit:

```bash
git add apps/api/src/routes apps/api/src/app.ts apps/api/test
git commit -m "feat(api): 添加用户管理接口"
```

---

### Task 8: 后台管理端路由、登录和账号管理

**Files:**

- Replace: `apps/admin/src/main.tsx`
- Replace: `apps/admin/src/styles.css`

- [ ] **Step 1: 替换后台主入口**

Replace `apps/admin/src/main.tsx` with a single-file implementation first. Keep it focused; split files later only if necessary.

```tsx
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { createApiClient, type FetchLike } from "@bjcp-arena/api-client";
import {
  adminRole,
  canAccessAdminApp,
  canManageUsers,
  roleLabels,
  userRoleValues,
  type UserPublic,
} from "@bjcp-arena/contracts";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const tokenKey = "bjcp-arena-admin-token";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function createClient(token: string | null) {
  return createApiClient({
    baseUrl: apiBaseUrl,
    fetch: fetch as FetchLike,
    getToken: () => token,
  });
}

interface AuthState {
  token: string | null;
  user: UserPublic | null;
}

function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: localStorage.getItem(tokenKey),
    user: null,
  }));
  const client = useMemo(() => createClient(auth.token), [auth.token]);

  function saveSession(token: string, user: UserPublic) {
    localStorage.setItem(tokenKey, token);
    setAuth({ token, user });
  }

  async function logout() {
    if (auth.token) {
      await client.logout().catch(() => undefined);
    }
    localStorage.removeItem(tokenKey);
    setAuth({ token: null, user: null });
  }

  return { auth, setAuth, client, saveSession, logout };
}

function BootstrapPage({
  saveSession,
}: {
  saveSession: (token: string, user: UserPublic) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const session = await createClient(null).bootstrapSuperAdmin({ password });
      saveSession(session.token, session.user);
      navigate("/", { replace: true });
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "初始化失败");
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-panel" onSubmit={submit}>
        <p className="eyebrow">初始化</p>
        <h1>创建超级管理员</h1>
        <div className="readonly-grid">
          <span>用户名</span>
          <strong>superadmin</strong>
          <span>昵称</span>
          <strong>superadmin</strong>
        </div>
        <label>
          密码
          <input
            value={password}
            minLength={6}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit">初始化并登录</button>
      </form>
    </main>
  );
}

function LoginPage({ saveSession }: { saveSession: (token: string, user: UserPublic) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const session = await createClient(null).login({ username, password });
      saveSession(session.token, session.user);
      navigate("/", { replace: true });
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "登录失败");
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-panel" onSubmit={submit}>
        <p className="eyebrow">Admin Console</p>
        <h1>BJCP Arena 后台管理</h1>
        <label>
          用户名
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          密码
          <input
            value={password}
            minLength={6}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit">登录</button>
      </form>
    </main>
  );
}

function DashboardPage({ user }: { user: UserPublic }) {
  return (
    <section className="page-section">
      <h2>概览</h2>
      <div className="info-grid">
        <div>
          <span>当前用户</span>
          <strong>{user.nickname}</strong>
        </div>
        <div>
          <span>用户名</span>
          <strong>{user.username}</strong>
        </div>
        <div>
          <span>角色</span>
          <strong>
            {userRoleValues
              .filter((role) => (user.roles & role) === role)
              .map((role) => roleLabels[role])
              .join("、")}
          </strong>
        </div>
        <div>
          <span>API</span>
          <strong>{apiBaseUrl}</strong>
        </div>
      </div>
    </section>
  );
}

function UsersPage({ token }: { token: string }) {
  const client = useMemo(() => createClient(token), [token]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [roles, setRoles] = useState(adminRole);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    const result = await client.listUsers();
    setUsers(result.users);
  }

  useEffect(() => {
    void loadUsers().catch((unknownError) => {
      setError(unknownError instanceof Error ? unknownError.message : "加载用户失败");
    });
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    await client.createUser({
      username: username || undefined,
      nickname: nickname || undefined,
      password,
      roles,
    });
    setUsername("");
    setNickname("");
    setPassword("");
    await loadUsers();
  }

  async function toggleDisabled(user: UserPublic) {
    await client.updateUser(user.id, { disabled: !user.disabled });
    await loadUsers();
  }

  async function updateRoles(user: UserPublic, nextRoles: number) {
    await client.updateUser(user.id, { roles: nextRoles });
    await loadUsers();
  }

  async function resetPassword(user: UserPublic) {
    const nextPassword = window.prompt(`请输入 ${user.username} 的新密码`, randomPassword());
    if (!nextPassword) {
      return;
    }
    await client.resetUserPassword(user.id, { password: nextPassword });
    await loadUsers();
  }

  return (
    <section className="page-section">
      <h2>账号管理</h2>
      <form className="toolbar-form" onSubmit={createUser}>
        <input
          placeholder="用户名，留空随机"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          placeholder="昵称，留空随机"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
        <input
          placeholder="密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="button" onClick={() => setPassword(randomPassword())}>
          随机密码
        </button>
        <select value={roles} onChange={(event) => setRoles(Number(event.target.value))}>
          <option value={adminRole}>赛事管理员</option>
          <option value={4}>裁判员</option>
          <option value={adminRole | 4}>管理员 + 裁判员</option>
        </select>
        <button type="submit">创建</button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.nickname}</td>
              <td>
                <select
                  value={user.roles}
                  onChange={(event) => updateRoles(user, Number(event.target.value))}
                >
                  <option value={1}>超级管理员</option>
                  <option value={2}>赛事管理员</option>
                  <option value={4}>裁判员</option>
                  <option value={6}>管理员 + 裁判员</option>
                  <option value={5}>超级管理员 + 裁判员</option>
                </select>
              </td>
              <td>{user.disabled ? "停用" : "启用"}</td>
              <td className="actions">
                <button type="button" onClick={() => resetPassword(user)}>
                  重置密码
                </button>
                <button type="button" onClick={() => toggleDisabled(user)}>
                  {user.disabled ? "启用" : "停用"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ForbiddenPage({ logout }: { logout: () => Promise<void> }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <p className="eyebrow">无权限</p>
        <h1>当前账号不可用于后台系统</h1>
        <button type="button" onClick={() => void logout()}>
          退出
        </button>
      </section>
    </main>
  );
}

function AdminLayout({
  user,
  token,
  logout,
}: {
  user: UserPublic;
  token: string;
  logout: () => Promise<void>;
}) {
  const location = useLocation();
  if (!canAccessAdminApp(user.roles)) {
    return <ForbiddenPage logout={logout} />;
  }

  return (
    <div className="admin-layout">
      <aside>
        <h1>BJCP Arena</h1>
        <nav>
          <Link className={location.pathname === "/" ? "active" : ""} to="/">
            概览
          </Link>
          {canManageUsers(user.roles) ? (
            <Link className={location.pathname === "/users" ? "active" : ""} to="/users">
              账号管理
            </Link>
          ) : null}
        </nav>
        <button type="button" onClick={() => void logout()}>
          退出
        </button>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage user={user} />} />
          <Route
            path="/users"
            element={
              canManageUsers(user.roles) ? (
                <UsersPage token={token} />
              ) : (
                <ForbiddenPage logout={logout} />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { auth, setAuth, client, saveSession, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  useEffect(() => {
    async function boot() {
      const status = await createClient(null).getBootstrapStatus();
      setHasUsers(status.hasUsers);
      if (auth.token) {
        try {
          const result = await client.me();
          setAuth({ token: auth.token, user: result.user });
        } catch {
          localStorage.removeItem(tokenKey);
          setAuth({ token: null, user: null });
        }
      }
      setLoading(false);
    }
    void boot();
  }, []);

  if (loading || hasUsers === null) {
    return <main className="auth-screen">加载中...</main>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/bootstrap"
          element={
            hasUsers ? (
              <Navigate to="/login" replace />
            ) : (
              <BootstrapPage saveSession={saveSession} />
            )
          }
        />
        <Route
          path="/login"
          element={
            auth.user ? <Navigate to="/" replace /> : <LoginPage saveSession={saveSession} />
          }
        />
        <Route
          path="/*"
          element={
            auth.token && auth.user ? (
              <AdminLayout user={auth.user} token={auth.token} logout={logout} />
            ) : (
              <Navigate to={hasUsers ? "/login" : "/bootstrap"} replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 2: 替换后台样式**

Replace `apps/admin/src/styles.css` with:

```css
:root {
  color: #17202a;
  background: #f6f8fb;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

button {
  border: 0;
  border-radius: 6px;
  background: #1f5eff;
  color: #ffffff;
  cursor: pointer;
  padding: 10px 14px;
}

button[type="button"] {
  background: #e7ecf3;
  color: #17202a;
}

.auth-screen {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
}

.auth-panel {
  display: grid;
  gap: 18px;
  width: min(100%, 420px);
  border: 1px solid #d7e1ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 28px;
}

.auth-panel h1,
aside h1,
.page-section h2 {
  margin: 0;
}

.eyebrow {
  margin: 0;
  color: #4b6b8a;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

label {
  display: grid;
  gap: 8px;
  color: #52616f;
  font-weight: 700;
}

input,
select {
  width: 100%;
  border: 1px solid #cdd8e4;
  border-radius: 6px;
  background: #ffffff;
  padding: 10px 12px;
}

.form-error {
  margin: 0;
  color: #b42318;
}

.readonly-grid,
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.readonly-grid span,
.info-grid span {
  color: #607084;
  font-size: 0.8rem;
}

.admin-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

aside {
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid #d7e1ea;
  background: #ffffff;
  padding: 24px;
}

nav {
  display: grid;
  gap: 8px;
}

nav a {
  border-radius: 6px;
  color: #26384d;
  padding: 10px 12px;
  text-decoration: none;
}

nav a.active {
  background: #eaf0ff;
  color: #1f5eff;
  font-weight: 800;
}

.admin-layout > main {
  padding: 28px;
}

.page-section {
  display: grid;
  gap: 20px;
}

.info-grid > div {
  border: 1px solid #d7e1ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
}

.toolbar-form {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid #d7e1ea;
  border-radius: 8px;
  background: #ffffff;
}

th,
td {
  border-bottom: 1px solid #edf1f5;
  padding: 12px;
  text-align: left;
}

.actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  aside {
    border-right: 0;
    border-bottom: 1px solid #d7e1ea;
  }

  .toolbar-form,
  .readonly-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: 运行后台类型检查**

Run:

```bash
pnpm --filter @bjcp-arena/admin typecheck
```

Expected: PASS. If TypeScript reports missing React namespace for `React.FormEvent`, import `type FormEvent` from `react` and replace `React.FormEvent` with `FormEvent`.

- [ ] **Step 4: 运行后台构建**

Run:

```bash
pnpm --filter @bjcp-arena/admin build
```

Expected: PASS.

- [ ] **Step 5: 提交检查点**

Only if user asked to commit:

```bash
git add apps/admin/src apps/admin/package.json pnpm-lock.yaml
git commit -m "feat(admin): 添加登录和账号管理页面"
```

---

### Task 9: 裁判端登录和用户信息展示

**Files:**

- Replace: `apps/judge/src/main.tsx`
- Replace: `apps/judge/src/styles.css`

- [ ] **Step 1: 替换裁判端主入口**

Replace `apps/judge/src/main.tsx` with:

```tsx
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient, type FetchLike } from "@bjcp-arena/api-client";
import {
  canAccessJudgeApp,
  roleLabels,
  userRoleValues,
  type UserPublic,
} from "@bjcp-arena/contracts";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const tokenKey = "bjcp-arena-judge-token";

function createClient(token: string | null) {
  return createApiClient({
    baseUrl: apiBaseUrl,
    fetch: fetch as FetchLike,
    getToken: () => token,
  });
}

function roleText(roles: number) {
  return userRoleValues
    .filter((role) => (roles & role) === role)
    .map((role) => roleLabels[role])
    .join("、");
}

function LoginForm({ onLogin }: { onLogin: (token: string, user: UserPublic) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const session = await createClient(null).login({ username, password });
      localStorage.setItem(tokenKey, session.token);
      onLogin(session.token, session.user);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "登录失败");
    }
  }

  return (
    <main className="phone-shell">
      <form className="panel" onSubmit={submit}>
        <p className="eyebrow">Judge H5</p>
        <h1>BJCP Arena 裁判端</h1>
        <label>
          用户名
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          密码
          <input
            value={password}
            minLength={6}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit">登录</button>
      </form>
    </main>
  );
}

function UserPanel({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: UserPublic;
  onLogout: () => void;
}) {
  const client = useMemo(() => createClient(token), [token]);

  async function logout() {
    await client.logout().catch(() => undefined);
    localStorage.removeItem(tokenKey);
    onLogout();
  }

  if (!canAccessJudgeApp(user.roles)) {
    return (
      <main className="phone-shell">
        <section className="panel">
          <p className="eyebrow">无权限</p>
          <h1>当前账号不可用于裁判端</h1>
          <p className="description">请使用具备裁判员角色的账号登录。</p>
          <button type="button" onClick={() => void logout()}>
            退出
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="phone-shell">
      <section className="panel">
        <p className="eyebrow">已登录</p>
        <h1>{user.nickname}</h1>
        <div className="status-card">
          <span>用户名</span>
          <strong>{user.username}</strong>
        </div>
        <div className="status-card">
          <span>角色</span>
          <strong>{roleText(user.roles)}</strong>
        </div>
        <div className="status-card">
          <span>API</span>
          <strong>{apiBaseUrl}</strong>
        </div>
        <button type="button" onClick={() => void logout()}>
          退出
        </button>
      </section>
    </main>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey));
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await createClient(token).me();
        setUser(result.user);
      } catch {
        localStorage.removeItem(tokenKey);
        setToken(null);
      }
      setLoading(false);
    }
    void boot();
  }, []);

  if (loading) {
    return <main className="phone-shell">加载中...</main>;
  }

  if (!token || !user) {
    return (
      <LoginForm
        onLogin={(nextToken, nextUser) => {
          setToken(nextToken);
          setUser(nextUser);
        }}
      />
    );
  }

  return (
    <UserPanel
      token={token}
      user={user}
      onLogout={() => {
        setToken(null);
        setUser(null);
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 2: 替换裁判端样式**

Replace `apps/judge/src/styles.css` with:

```css
:root {
  color: #1e293b;
  background: #edf6f9;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.phone-shell {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 20px;
}

.panel {
  display: grid;
  gap: 18px;
  width: min(100%, 420px);
  border: 1px solid #cce0df;
  border-radius: 8px;
  background: #ffffff;
  padding: 28px;
}

.eyebrow {
  margin: 0;
  color: #2b6f6f;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.12;
}

.description {
  margin: 0;
  color: #52616f;
  line-height: 1.55;
}

label {
  display: grid;
  gap: 8px;
  color: #52616f;
  font-weight: 700;
}

input {
  border: 1px solid #cce0df;
  border-radius: 6px;
  padding: 11px 12px;
}

button {
  border: 0;
  border-radius: 6px;
  background: #2b6f6f;
  color: #ffffff;
  cursor: pointer;
  padding: 11px 14px;
}

.form-error {
  margin: 0;
  color: #b42318;
}

.status-card {
  display: grid;
  gap: 8px;
  border-top: 1px solid #dce9e9;
  padding: 16px 0 0;
}

.status-card span {
  color: #607477;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-card strong {
  overflow-wrap: anywhere;
  font-size: 1rem;
}
```

- [ ] **Step 3: 运行裁判端类型检查**

Run:

```bash
pnpm --filter @bjcp-arena/judge typecheck
```

Expected: PASS. If TypeScript reports missing React namespace for `React.FormEvent`, import `type FormEvent` from `react` and replace `React.FormEvent` with `FormEvent`.

- [ ] **Step 4: 运行裁判端构建**

Run:

```bash
pnpm --filter @bjcp-arena/judge build
```

Expected: PASS.

- [ ] **Step 5: 提交检查点**

Only if user asked to commit:

```bash
git add apps/judge/src
git commit -m "feat(judge): 添加裁判端登录页面"
```

---

### Task 10: 文档更新

**Files:**

- Modify: `docs/local-dev.md`
- Modify: `docs/testing.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: 更新本地开发文档**

In `docs/local-dev.md`, update the environment variable section to include:

```text
DATABASE_URL=postgresql://bjcp_arena:bjcp_arena@127.0.0.1:25432/bjcp_arena
REDIS_URL=redis://127.0.0.1:26379
JWT_SECRET=local-development-secret-change-me
JWT_EXPIRES_IN=7d
```

Add this after infrastructure ports:

````markdown
## 数据库迁移

启动 PostgreSQL 后运行：

```bash
pnpm --filter @bjcp-arena/api db:generate
pnpm --filter @bjcp-arena/api db:migrate
```

首次打开后台系统时，如果用户表为空，会进入超级管理员初始化页面。初始化账号固定为：

```text
username=superadmin
nickname=superadmin
```
````

- [ ] **Step 2: 更新测试文档**

In `docs/testing.md`, add this under API coverage:

```markdown
- 用户 bootstrap、登录、`me`、用户管理权限和 `authVersion` 失效。
```

Add this under API client coverage:

```markdown
- 公开 auth 请求不带 token，认证请求自动带 Bearer token。
- 用户管理方法解析 contracts 响应。
```

Add this to manual smoke:

```markdown
- 后台初始化 `superadmin`。
- 超管创建管理员和裁判员。
- 管理员可进入后台但不可访问账号管理。
- 仅裁判员角色可进入裁判端。
```

- [ ] **Step 3: 更新架构文档**

In `docs/architecture.md`, add a new section:

```markdown
## 认证与账号

基础用户模块使用 PostgreSQL 持久化用户，Prisma 负责 schema 和迁移。登录成功后 API 签发 7 天 JWT，前端存入 `localStorage` 并通过 `Authorization: Bearer <token>` 调用受保护接口。

Redis 只缓存用户当前 `authVersion`。当修改用户名、角色、停用状态或重置密码时，API 递增 DB 中的 `authVersion` 并同步 Redis。后续请求中，JWT payload 的 `authVersion` 必须与当前值一致。

角色使用 bitmask 存储：`SUPER_ADMIN=1`、`ADMIN=2`、`JUDGE=4`。用户可以有多个角色。后台入口要求 `SUPER_ADMIN` 或 `ADMIN`，账号管理要求 `SUPER_ADMIN`，裁判端入口要求 `JUDGE`。
```

- [ ] **Step 4: 运行格式检查**

Run:

```bash
pnpm format:check
```

Expected: PASS or reports formatting differences only in files touched by this task.

- [ ] **Step 5: 提交检查点**

Only if user asked to commit:

```bash
git add docs/local-dev.md docs/testing.md docs/architecture.md
git commit -m "docs(docs): 补充用户模块开发说明"
```

---

### Task 11: 全量验证与人工 smoke

**Files:**

- No planned source edits unless verification exposes defects.

- [ ] **Step 1: 运行 contracts 测试**

Run:

```bash
pnpm test:contracts
```

Expected: PASS.

- [ ] **Step 2: 运行 api-client 测试**

Run:

```bash
pnpm test:api-client
```

Expected: PASS.

- [ ] **Step 3: 运行 API 测试**

Run:

```bash
pnpm test:api
```

Expected: PASS.

- [ ] **Step 4: 运行全量 verify**

Run:

```bash
pnpm verify
```

Expected: PASS.

- [ ] **Step 5: 启动基础设施**

Run:

```bash
pnpm infra:up
```

Expected: PostgreSQL and Redis containers are healthy.

- [ ] **Step 6: 执行数据库迁移**

Run:

```bash
pnpm --filter @bjcp-arena/api db:migrate
```

Expected: migration applied to local PostgreSQL.

- [ ] **Step 7: 启动开发服务**

Run:

```bash
pnpm dev
```

Expected: API, admin, judge, board dev servers start.

- [ ] **Step 8: 人工 smoke 后台**

Open:

```text
http://localhost:5173
```

Expected:

- 用户表为空时进入 `/bootstrap`。
- 输入密码后创建并登录 `superadmin`。
- 进入后台左右布局。
- 账号管理菜单可见。
- 可以创建管理员、裁判员、管理员 + 裁判员。
- 管理员登录后可进入后台，但账号管理不可见。
- 裁判员登录后台后显示角色不匹配提示。

- [ ] **Step 9: 人工 smoke 裁判端**

Open:

```text
http://localhost:5174
```

Expected:

- 裁判员可登录并看到当前用户信息。
- 仅管理员或仅超管登录后显示当前账号不可用于裁判端。
- `ADMIN | JUDGE` 或 `SUPER_ADMIN | JUDGE` 账号可进入裁判端。

- [ ] **Step 10: 停止开发服务**

Stop the `pnpm dev` session with `Ctrl+C`.

- [ ] **Step 11: 最终提交检查点**

Only if user asked to commit:

```bash
git add apps packages docs package.json pnpm-lock.yaml
git commit -m "feat(auth): 实现基础用户模块"
```

## Self-Review

Spec coverage:

- 用户表、Prisma、PostgreSQL：Task 1, Task 5。
- JWT 7 天、localStorage、Bearer token：Task 3, Task 4, Task 8, Task 9。
- Redis `authVersion`：Task 4, Task 6, Task 7。
- 超管初始化固定 `superadmin`：Task 2, Task 6, Task 8。
- 账号管理：Task 2, Task 3, Task 7, Task 8。
- 后台权限和裁判端权限严格按角色 bitmask：Task 2, Task 7, Task 8, Task 9。
- `board` 不改：本计划没有 `apps/board` 文件。
- 测试边界：Task 2, Task 3, Task 6, Task 7, Task 11。

Placeholder scan:

- 本计划没有未收敛占位项。
- 前端 UI 先以单文件实现，计划给出了完整替换内容。

Type consistency:

- `UserPublic`、`AuthSession`、`CreateUserInput`、`UpdateUserInput` 由 contracts 定义，api-client、API 和前端均引用同名类型。
- `authVersion` 在 DB、JWT payload、contract 和 API 测试中统一命名。
- `canAccessAdminApp`、`canManageUsers`、`canAccessJudgeApp` 均由 contracts 导出，前端和后端共用。
