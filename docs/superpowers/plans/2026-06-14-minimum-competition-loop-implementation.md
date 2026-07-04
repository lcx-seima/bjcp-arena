# 注记：大屏端已暂停并从当前代码中移除；以下为历史实施记录，保留原始上下文。

# 啤酒比赛最小闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通后台比赛和酒款管理、裁判登录评分、指定比赛大屏实时统计的最小闭环。

**Architecture:** 先在 `packages/contracts` 定义比赛、酒款、评分、BJCP 常量和路径契约，再由 API、api-client、admin、judge、board 逐层消费。后端新增 `competitions`、`beers`、`scores` 三个模块，评分统计以数据库 summary 为准，SSE 只作为刷新信号。

**Tech Stack:** pnpm monorepo, TypeScript, Zod, Fastify, Prisma, PostgreSQL, Redis auth snapshot, React, Mantine, lucide-react, Vitest.

**Repo Rule:** 本仓库要求提交信息使用中文 Conventional Commits，且除非用户明确要求，不自动执行 `git commit`。计划中的提交步骤均为“用户要求提交时使用”的检查点。

---

## File Structure

新增或修改的主要文件：

- Modify: `packages/contracts/src/users.ts`
  - 用户创建和更新增加 `judgeType`。
- Modify: `packages/contracts/src/auth.ts`
  - `userPublicSchema` 增加 `judgeType`。
- Create: `packages/contracts/src/judge-types.ts`
  - 定义 `professional` 和 `public` 评委类型。
- Create: `packages/contracts/src/bjcp-styles.ts`
  - 定义 MVP 所需 BJCP 大类/子类常量和 schema。
- Create: `packages/contracts/src/competitions.ts`
  - 比赛路径、状态、请求/响应 schema。
- Create: `packages/contracts/src/beers.ts`
  - 酒款路径、状态、请求/响应 schema、二维码墙 schema。
- Create: `packages/contracts/src/scores.ts`
  - 专业裁判和大众评委评分 schema、裁判评分路径。
- Create: `packages/contracts/src/board.ts`
  - 大屏 summary 和 SSE 路径、schema。
- Modify: `packages/contracts/src/index.ts`
  - 导出新增契约。
- Test: `packages/contracts/test/*.test.ts`
  - 覆盖新增路径、状态、schema。

- Modify: `apps/api/prisma/schema.prisma`
  - 增加 `judgeType`、`Competition`、`BeerEntry`、`Score`。
- Create: `apps/api/prisma/migrations/0002_create_competition_loop/migration.sql`
  - 数据库迁移。
- Modify: `apps/api/src/modules/users/*`
  - 用户 repository、mapper、routes 支持 `judgeType`。
- Create: `apps/api/src/shared/http/auth-guards.ts`
  - 复用后台和裁判鉴权。
- Create: `apps/api/src/modules/competitions/*`
  - 比赛 types、repository、service、routes、errors、mapper。
- Create: `apps/api/src/modules/beers/*`
  - 酒款 types、repository、service、routes、errors、mapper。
- Create: `apps/api/src/modules/scores/*`
  - 评分 types、repository、service、routes、events、summary、errors、mapper。
- Modify: `apps/api/src/app.ts`
  - 注入并注册新增模块。
- Test: `apps/api/test/integration/*.test.ts`
  - 覆盖比赛、酒款、评分、大屏 summary、SSE。
- Test: `apps/api/test/unit/*.test.ts`
  - 覆盖 entryNumber 分配和评分汇总纯逻辑。

- Modify: `packages/api-client/src/create-client.ts`
  - 增加比赛、酒款、评分、大屏方法。
- Test: `packages/api-client/test/create-client.test.ts`
  - 覆盖新增方法请求与响应解析。

- Modify/Create under `apps/admin/src/`
  - 比赛列表、比赛详情、酒款表单、二维码墙。
- Modify/Create under `apps/judge/src/`
  - 裁判评分页、两套评分表单、最后提交时间提示。
- Modify/Create under `apps/board/src/`
  - 指定比赛看板、summary 拉取、SSE invalidation、低频兜底刷新。

## Task 1: Contracts - Judge Type And User Surface

**Files:**
- Create: `packages/contracts/src/judge-types.ts`
- Modify: `packages/contracts/src/auth.ts`
- Modify: `packages/contracts/src/users.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/test/users.test.ts`

- [ ] **Step 1: Write failing contract tests for judge type**

Add to `packages/contracts/test/users.test.ts`:

```ts
import {
  judgeTypePublic,
  judgeTypeProfessional,
  judgeTypeSchema,
} from "../src/index.js";

it("defines judge type constants", () => {
  expect(judgeTypeProfessional).toBe("professional");
  expect(judgeTypePublic).toBe("public");
  expect(judgeTypeSchema.parse("professional")).toBe("professional");
  expect(judgeTypeSchema.parse("public")).toBe("public");
  expect(() => judgeTypeSchema.parse("guest")).toThrow();
});

it("parses judge type on user create and update input", () => {
  expect(
    createUserInputSchema.parse({
      username: "judge03",
      password: "secret123",
      roles: judgeRole,
      judgeType: judgeTypeProfessional,
    })
  ).toMatchObject({
    judgeType: judgeTypeProfessional,
  });

  expect(updateUserInputSchema.parse({ judgeType: judgeTypePublic })).toEqual({
    judgeType: judgeTypePublic,
  });
  expect(updateUserInputSchema.parse({ judgeType: null })).toEqual({
    judgeType: null,
  });
});
```

Also extend the existing `user` fixture in `parses user list and single user results`:

```ts
judgeType: judgeTypeProfessional,
```

- [ ] **Step 2: Run contracts test and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/contracts test -- users.test.ts
```

Expected: FAIL because `judge-types.ts` exports and `judgeType` fields do not exist.

- [ ] **Step 3: Add judge type contract**

Create `packages/contracts/src/judge-types.ts`:

```ts
import { z } from "zod";

export const judgeTypeProfessional = "professional" as const;
export const judgeTypePublic = "public" as const;

export const judgeTypes = [judgeTypeProfessional, judgeTypePublic] as const;
export const judgeTypeSchema = z.enum(judgeTypes);
export const nullableJudgeTypeSchema = judgeTypeSchema.nullable();

export type JudgeType = z.infer<typeof judgeTypeSchema>;
```

Modify `packages/contracts/src/auth.ts` by importing `nullableJudgeTypeSchema` and adding it to `userPublicSchema`:

```ts
import { nullableJudgeTypeSchema } from "./judge-types.js";

export const userPublicSchema = z.object({
  id: z.number().int().positive(),
  username: usernameSchema,
  nickname: z.string(),
  roles: userRolesSchema,
  judgeType: nullableJudgeTypeSchema,
  disabled: z.boolean(),
  authVersion: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
```

Modify `packages/contracts/src/users.ts`:

```ts
import { nullableJudgeTypeSchema } from "./judge-types.js";

export const createUserInputSchema = z.object({
  username: usernameSchema.optional(),
  nickname: z.string().min(1).max(64).optional(),
  password: passwordSchema,
  roles: userRolesSchema,
  judgeType: nullableJudgeTypeSchema.optional(),
});

export const updateUserInputSchema = z
  .object({
    username: usernameSchema.optional(),
    nickname: z.string().min(1).max(64).optional(),
    roles: userRolesSchema.optional(),
    judgeType: nullableJudgeTypeSchema.optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
```

Modify `packages/contracts/src/index.ts`:

```ts
export * from "./judge-types.js";
```

- [ ] **Step 4: Run contracts test**

Run:

```bash
pnpm --filter @bjcp-arena/contracts test -- users.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit checkpoint if user asked for commits**

```bash
git add packages/contracts/src/auth.ts packages/contracts/src/users.ts packages/contracts/src/index.ts packages/contracts/src/judge-types.ts packages/contracts/test/users.test.ts
git commit -m "feat(contracts): 增加评委类型契约"
```

## Task 2: Contracts - Competition, Beer, Score, Board

**Files:**
- Create: `packages/contracts/src/bjcp-styles.ts`
- Create: `packages/contracts/src/competitions.ts`
- Create: `packages/contracts/src/beers.ts`
- Create: `packages/contracts/src/scores.ts`
- Create: `packages/contracts/src/board.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/test/competition-loop.test.ts`

- [ ] **Step 1: Write failing contract tests**

Create `packages/contracts/test/competition-loop.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  beerByIdPath,
  beerListPath,
  beerQrCodesPath,
  beerStatusSchema,
  bjcpSubcategories,
  boardCompetitionEventsPath,
  boardCompetitionSummaryPath,
  competitionByIdPath,
  competitionListPath,
  competitionStatusPath,
  competitionStatusSchema,
  createBeerInputSchema,
  createCompetitionInputSchema,
  judgeBeerDetailPath,
  judgeMyScorePath,
  professionalScoreInputSchema,
  publicScoreInputSchema,
} from "../src/index.js";

describe("competition loop contracts", () => {
  it("defines competition paths and statuses", () => {
    expect(competitionListPath).toBe("/api/competitions");
    expect(competitionByIdPath(2)).toBe("/api/competitions/2");
    expect(competitionStatusPath(2)).toBe("/api/competitions/2/status");
    expect(competitionStatusSchema.parse("draft")).toBe("draft");
    expect(competitionStatusSchema.parse("judging")).toBe("judging");
    expect(competitionStatusSchema.parse("closed")).toBe("closed");
    expect(competitionStatusSchema.parse("published")).toBe("published");
  });

  it("defines beer paths and statuses", () => {
    expect(beerListPath(2)).toBe("/api/competitions/2/beers");
    expect(beerByIdPath(2, 5)).toBe("/api/competitions/2/beers/5");
    expect(beerQrCodesPath(2)).toBe("/api/competitions/2/qr-codes");
    expect(beerStatusSchema.parse("draft")).toBe("draft");
    expect(beerStatusSchema.parse("published")).toBe("published");
    expect(beerStatusSchema.parse("removed")).toBe("removed");
  });

  it("defines judge and board paths", () => {
    expect(judgeBeerDetailPath(2, 5)).toBe("/api/judge/competitions/2/beers/5");
    expect(judgeMyScorePath(2, 5)).toBe("/api/judge/competitions/2/beers/5/my-score");
    expect(boardCompetitionSummaryPath(2)).toBe("/api/board/competitions/2/summary");
    expect(boardCompetitionEventsPath(2)).toBe("/api/board/competitions/2/events");
  });

  it("parses competition and beer input", () => {
    expect(createCompetitionInputSchema.parse({ name: "夏季赛", description: "MVP" })).toEqual({
      name: "夏季赛",
      description: "MVP",
    });

    const style = bjcpSubcategories[0];
    expect(
      createBeerInputSchema.parse({
        realName: "Secret IPA",
        producer: "Brewery",
        bjcpSubcategoryCode: style.subcategoryCode,
        description: "入口清爽",
      })
    ).toMatchObject({
      bjcpSubcategoryCode: style.subcategoryCode,
    });
  });

  it("parses professional and public score inputs", () => {
    expect(
      professionalScoreInputSchema.parse({
        professionalAromaScore: 10,
        professionalAppearanceScore: 3,
        professionalFlavorScore: 17,
        professionalMouthfeelScore: 4,
        professionalOverallScore: 8,
        professionalOverallComment: "平衡",
      })
    ).toMatchObject({
      professionalFlavorScore: 17,
    });

    expect(
      publicScoreInputSchema.parse({
        publicOverallPreferenceScore: 8,
        publicAromaBodyFoamScore: 4,
        publicEntryAcceptanceScore: 5,
        publicWillingToDrinkScore: 4,
        publicComment: "愿意再喝",
      })
    ).toMatchObject({
      publicOverallPreferenceScore: 8,
    });

    expect(() =>
      professionalScoreInputSchema.parse({
        professionalAromaScore: 13,
        professionalAppearanceScore: 3,
        professionalFlavorScore: 17,
        professionalMouthfeelScore: 4,
        professionalOverallScore: 8,
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run contracts test and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/contracts test -- competition-loop.test.ts
```

Expected: FAIL because new contract files do not exist.

- [ ] **Step 3: Create BJCP style constants**

Create `packages/contracts/src/bjcp-styles.ts`:

```ts
import { z } from "zod";

export const bjcpSubcategories = [
  {
    categoryCode: "10",
    categoryName: "German Wheat Beer",
    subcategoryCode: "10A",
    subcategoryName: "Weissbier",
  },
  {
    categoryCode: "21",
    categoryName: "IPA",
    subcategoryCode: "21A",
    subcategoryName: "American IPA",
  },
  {
    categoryCode: "21",
    categoryName: "IPA",
    subcategoryCode: "21B",
    subcategoryName: "Specialty IPA",
  },
] as const;

export const bjcpSubcategoryCodeSchema = z.enum(
  bjcpSubcategories.map((style) => style.subcategoryCode) as [
    (typeof bjcpSubcategories)[number]["subcategoryCode"],
    ...(typeof bjcpSubcategories)[number]["subcategoryCode"][],
  ]
);

export const bjcpStyleSnapshotSchema = z.object({
  bjcpCategoryCode: z.string().min(1),
  bjcpCategoryName: z.string().min(1),
  bjcpSubcategoryCode: z.string().min(1),
  bjcpSubcategoryName: z.string().min(1),
});

export function findBjcpSubcategory(code: string) {
  return bjcpSubcategories.find((style) => style.subcategoryCode === code) ?? null;
}
```

- [ ] **Step 4: Create competition contract**

Create `packages/contracts/src/competitions.ts`:

```ts
import { z } from "zod";

export const competitionListPath = "/api/competitions" as const;

export function competitionByIdPath(competitionId: number) {
  return `/api/competitions/${competitionId}` as const;
}

export function competitionStatusPath(competitionId: number) {
  return `/api/competitions/${competitionId}/status` as const;
}

export const competitionStatuses = ["draft", "judging", "closed", "published"] as const;
export const competitionStatusSchema = z.enum(competitionStatuses);

export const createCompetitionInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export const updateCompetitionInputSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const updateCompetitionStatusInputSchema = z.object({
  status: competitionStatusSchema,
});

export const competitionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  status: competitionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const competitionListResultSchema = z.object({
  competitions: z.array(competitionSchema),
});

export const competitionResultSchema = z.object({
  competition: competitionSchema,
});

export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;
export type CreateCompetitionInput = z.infer<typeof createCompetitionInputSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionInputSchema>;
export type UpdateCompetitionStatusInput = z.infer<typeof updateCompetitionStatusInputSchema>;
export type CompetitionResult = z.infer<typeof competitionResultSchema>;
export type CompetitionListResult = z.infer<typeof competitionListResultSchema>;
```

- [ ] **Step 5: Create beer contract**

Create `packages/contracts/src/beers.ts`:

```ts
import { z } from "zod";
import { bjcpStyleSnapshotSchema, bjcpSubcategoryCodeSchema } from "./bjcp-styles.js";

export function beerListPath(competitionId: number) {
  return `/api/competitions/${competitionId}/beers` as const;
}

export function beerByIdPath(competitionId: number, beerId: number) {
  return `/api/competitions/${competitionId}/beers/${beerId}` as const;
}

export function beerStatusPath(competitionId: number, beerId: number) {
  return `/api/competitions/${competitionId}/beers/${beerId}/status` as const;
}

export function beerQrCodesPath(competitionId: number) {
  return `/api/competitions/${competitionId}/qr-codes` as const;
}

export const beerStatuses = ["draft", "published", "removed"] as const;
export const beerStatusSchema = z.enum(beerStatuses);

export const createBeerInputSchema = z.object({
  realName: z.string().min(1).max(160),
  producer: z.string().min(1).max(160),
  bjcpSubcategoryCode: bjcpSubcategoryCodeSchema,
  description: z.string().min(1).max(5000),
});

export const updateBeerInputSchema = createBeerInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const updateBeerStatusInputSchema = z.object({
  status: beerStatusSchema,
});

export const beerSchema = bjcpStyleSnapshotSchema.extend({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  entryNumber: z.number().int().positive(),
  realName: z.string(),
  producer: z.string(),
  description: z.string(),
  status: beerStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const judgeBeerSchema = bjcpStyleSnapshotSchema.extend({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  entryNumber: z.number().int().positive(),
  description: z.string(),
  status: beerStatusSchema,
  competitionStatus: z.string(),
  canScore: z.boolean(),
});

export const beerListResultSchema = z.object({ beers: z.array(beerSchema) });
export const beerResultSchema = z.object({ beer: beerSchema });
export const judgeBeerResultSchema = z.object({ beer: judgeBeerSchema });

export const beerQrCodeSchema = beerSchema.pick({
  id: true,
  competitionId: true,
  entryNumber: true,
  realName: true,
  producer: true,
  bjcpCategoryCode: true,
  bjcpCategoryName: true,
  bjcpSubcategoryCode: true,
  bjcpSubcategoryName: true,
}).extend({
  judgeUrl: z.string().url(),
});

export const beerQrCodeListResultSchema = z.object({
  beers: z.array(beerQrCodeSchema),
});

export type BeerStatus = z.infer<typeof beerStatusSchema>;
export type CreateBeerInput = z.infer<typeof createBeerInputSchema>;
export type UpdateBeerInput = z.infer<typeof updateBeerInputSchema>;
export type UpdateBeerStatusInput = z.infer<typeof updateBeerStatusInputSchema>;
export type BeerResult = z.infer<typeof beerResultSchema>;
export type BeerListResult = z.infer<typeof beerListResultSchema>;
export type BeerQrCodeListResult = z.infer<typeof beerQrCodeListResultSchema>;
```

- [ ] **Step 6: Create score contract**

Create `packages/contracts/src/scores.ts`:

```ts
import { z } from "zod";
import { judgeTypeSchema } from "./judge-types.js";

export function judgeBeerDetailPath(competitionId: number, beerId: number) {
  return `/api/judge/competitions/${competitionId}/beers/${beerId}` as const;
}

export function judgeMyScorePath(competitionId: number, beerId: number) {
  return `/api/judge/competitions/${competitionId}/beers/${beerId}/my-score` as const;
}

const scoreCommentSchema = z.string().max(2000).optional();

export const professionalScoreInputSchema = z.object({
  professionalAromaScore: z.number().int().min(0).max(12),
  professionalAromaComment: scoreCommentSchema,
  professionalAppearanceScore: z.number().int().min(0).max(3),
  professionalAppearanceComment: scoreCommentSchema,
  professionalFlavorScore: z.number().int().min(0).max(20),
  professionalFlavorComment: scoreCommentSchema,
  professionalMouthfeelScore: z.number().int().min(0).max(5),
  professionalMouthfeelComment: scoreCommentSchema,
  professionalOverallScore: z.number().int().min(0).max(10),
  professionalOverallComment: scoreCommentSchema,
});

export const publicScoreInputSchema = z.object({
  publicOverallPreferenceScore: z.number().int().min(1).max(10),
  publicAromaBodyFoamScore: z.number().int().min(1).max(5),
  publicEntryAcceptanceScore: z.number().int().min(1).max(5),
  publicWillingToDrinkScore: z.number().int().min(1).max(5),
  publicComment: scoreCommentSchema,
});

export const scoreInputSchema = z.discriminatedUnion("judgeType", [
  professionalScoreInputSchema.extend({ judgeType: z.literal("professional") }),
  publicScoreInputSchema.extend({ judgeType: z.literal("public") }),
]);

export const myScoreSchema = z.object({
  id: z.number().int().positive(),
  beerId: z.number().int().positive(),
  judgeUserId: z.number().int().positive(),
  judgeTypeSnapshot: judgeTypeSchema,
  judgeNicknameSnapshot: z.string(),
  professionalTotalScore: z.number().int().min(0).max(50).nullable(),
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).passthrough();

export const myScoreResultSchema = z.object({
  score: myScoreSchema.nullable(),
});

export const submitMyScoreResultSchema = z.object({
  score: myScoreSchema,
});

export type ProfessionalScoreInput = z.infer<typeof professionalScoreInputSchema>;
export type PublicScoreInput = z.infer<typeof publicScoreInputSchema>;
export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type MyScoreResult = z.infer<typeof myScoreResultSchema>;
export type SubmitMyScoreResult = z.infer<typeof submitMyScoreResultSchema>;
```

- [ ] **Step 7: Create board contract**

Create `packages/contracts/src/board.ts`:

```ts
import { z } from "zod";
import { competitionStatusSchema } from "./competitions.js";

export function boardCompetitionSummaryPath(competitionId: number) {
  return `/api/board/competitions/${competitionId}/summary` as const;
}

export function boardCompetitionEventsPath(competitionId: number) {
  return `/api/board/competitions/${competitionId}/events` as const;
}

export const boardBeerSummarySchema = z.object({
  beerId: z.number().int().positive(),
  entryNumber: z.number().int().positive(),
  realName: z.string().nullable(),
  producer: z.string().nullable(),
  bjcpCategoryCode: z.string(),
  bjcpCategoryName: z.string(),
  bjcpSubcategoryCode: z.string(),
  bjcpSubcategoryName: z.string(),
  professionalJudgeCount: z.number().int().nonnegative(),
  professionalAverageTotalScore: z.number().nullable(),
  publicJudgeCount: z.number().int().nonnegative(),
  publicAverageOverallPreference: z.number().nullable(),
  publicAverageAromaBodyFoam: z.number().nullable(),
  publicAverageEntryAcceptance: z.number().nullable(),
  publicAverageWillingToDrink: z.number().nullable(),
});

export const boardCompetitionSummarySchema = z.object({
  competition: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    status: competitionStatusSchema,
  }),
  beerCount: z.number().int().nonnegative(),
  beers: z.array(boardBeerSummarySchema),
  updatedAt: z.string().datetime(),
});

export type BoardCompetitionSummary = z.infer<typeof boardCompetitionSummarySchema>;
```

- [ ] **Step 8: Export contracts and run tests**

Modify `packages/contracts/src/index.ts`:

```ts
export * from "./bjcp-styles.js";
export * from "./competitions.js";
export * from "./beers.js";
export * from "./scores.js";
export * from "./board.js";
```

Run:

```bash
pnpm --filter @bjcp-arena/contracts test
```

Expected: PASS.

- [ ] **Step 9: Commit checkpoint if user asked for commits**

```bash
git add packages/contracts/src packages/contracts/test/competition-loop.test.ts
git commit -m "feat(contracts): 定义比赛酒款评分契约"
```

## Task 3: Database And User Judge Type Persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/0002_create_competition_loop/migration.sql`
- Modify: `apps/api/src/modules/users/users.types.ts`
- Modify: `apps/api/src/modules/users/users.repository.ts`
- Modify: `apps/api/src/modules/users/user-mapper.ts`
- Modify: `apps/api/src/modules/users/users.routes.ts`
- Test: `apps/api/test/integration/users.routes.test.ts`
- Test: `apps/api/test/unit/user-repository.test.ts`

- [ ] **Step 1: Write failing user judge type API test**

Add to `apps/api/test/integration/users.routes.test.ts`:

```ts
import { judgeTypeProfessional, judgeTypePublic } from "@bjcp-arena/contracts";

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
```

- [ ] **Step 2: Run API users test and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- users.routes.test.ts
```

Expected: FAIL because repository and mapper do not support `judgeType`.

- [ ] **Step 3: Update Prisma schema**

Modify `apps/api/prisma/schema.prisma`:

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  nickname     String
  passwordHash String   @map("password_hash")
  roles        Int
  judgeType    String?  @map("judge_type")
  disabled     Boolean  @default(false)
  authVersion  Int      @default(0) @map("auth_version")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")

  scores Score[]

  @@index([roles], map: "users_roles_idx")
  @@index([disabled], map: "users_disabled_idx")
  @@map("users")
}

model Competition {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  status      String   @default("draft")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  beers BeerEntry[]

  @@index([status], map: "competitions_status_idx")
  @@map("competitions")
}

model BeerEntry {
  id                  Int      @id @default(autoincrement())
  competitionId       Int      @map("competition_id")
  entryNumber         Int      @map("entry_number")
  realName            String   @map("real_name")
  producer            String
  bjcpCategoryCode    String   @map("bjcp_category_code")
  bjcpCategoryName    String   @map("bjcp_category_name")
  bjcpSubcategoryCode String   @map("bjcp_subcategory_code")
  bjcpSubcategoryName String   @map("bjcp_subcategory_name")
  description         String
  status              String   @default("draft")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @default(now()) @updatedAt @map("updated_at")

  competition Competition @relation(fields: [competitionId], references: [id], onDelete: Restrict)
  scores      Score[]

  @@unique([competitionId, entryNumber], map: "beer_entries_competition_entry_number_key")
  @@index([competitionId, status], map: "beer_entries_competition_status_idx")
  @@map("beer_entries")
}

model Score {
  id                              Int      @id @default(autoincrement())
  beerId                          Int      @map("beer_id")
  judgeUserId                     Int      @map("judge_user_id")
  judgeTypeSnapshot               String   @map("judge_type_snapshot")
  judgeNicknameSnapshot           String   @map("judge_nickname_snapshot")
  professionalAromaScore          Int?     @map("professional_aroma_score")
  professionalAromaComment        String?  @map("professional_aroma_comment")
  professionalAppearanceScore     Int?     @map("professional_appearance_score")
  professionalAppearanceComment   String?  @map("professional_appearance_comment")
  professionalFlavorScore         Int?     @map("professional_flavor_score")
  professionalFlavorComment       String?  @map("professional_flavor_comment")
  professionalMouthfeelScore      Int?     @map("professional_mouthfeel_score")
  professionalMouthfeelComment    String?  @map("professional_mouthfeel_comment")
  professionalOverallScore        Int?     @map("professional_overall_score")
  professionalOverallComment      String?  @map("professional_overall_comment")
  professionalTotalScore          Int?     @map("professional_total_score")
  publicOverallPreferenceScore    Int?     @map("public_overall_preference_score")
  publicAromaBodyFoamScore        Int?     @map("public_aroma_body_foam_score")
  publicEntryAcceptanceScore      Int?     @map("public_entry_acceptance_score")
  publicWillingToDrinkScore       Int?     @map("public_willing_to_drink_score")
  publicComment                   String?  @map("public_comment")
  submittedAt                     DateTime @map("submitted_at")
  createdAt                       DateTime @default(now()) @map("created_at")
  updatedAt                       DateTime @default(now()) @updatedAt @map("updated_at")

  beer      BeerEntry @relation(fields: [beerId], references: [id], onDelete: Restrict)
  judgeUser User      @relation(fields: [judgeUserId], references: [id], onDelete: Restrict)

  @@unique([beerId, judgeUserId], map: "scores_beer_judge_user_key")
  @@index([beerId, judgeTypeSnapshot], map: "scores_beer_judge_type_idx")
  @@map("scores")
}
```

- [ ] **Step 4: Create migration SQL**

Create `apps/api/prisma/migrations/0002_create_competition_loop/migration.sql`:

```sql
ALTER TABLE "users" ADD COLUMN "judge_type" TEXT;

CREATE TABLE "competitions" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "competitions_status_idx" ON "competitions"("status");

CREATE TABLE "beer_entries" (
  "id" SERIAL PRIMARY KEY,
  "competition_id" INTEGER NOT NULL REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "entry_number" INTEGER NOT NULL,
  "real_name" TEXT NOT NULL,
  "producer" TEXT NOT NULL,
  "bjcp_category_code" TEXT NOT NULL,
  "bjcp_category_name" TEXT NOT NULL,
  "bjcp_subcategory_code" TEXT NOT NULL,
  "bjcp_subcategory_name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "beer_entries_competition_entry_number_key" ON "beer_entries"("competition_id", "entry_number");
CREATE INDEX "beer_entries_competition_status_idx" ON "beer_entries"("competition_id", "status");

CREATE TABLE "scores" (
  "id" SERIAL PRIMARY KEY,
  "beer_id" INTEGER NOT NULL REFERENCES "beer_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "judge_user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "judge_type_snapshot" TEXT NOT NULL,
  "judge_nickname_snapshot" TEXT NOT NULL,
  "professional_aroma_score" INTEGER,
  "professional_aroma_comment" TEXT,
  "professional_appearance_score" INTEGER,
  "professional_appearance_comment" TEXT,
  "professional_flavor_score" INTEGER,
  "professional_flavor_comment" TEXT,
  "professional_mouthfeel_score" INTEGER,
  "professional_mouthfeel_comment" TEXT,
  "professional_overall_score" INTEGER,
  "professional_overall_comment" TEXT,
  "professional_total_score" INTEGER,
  "public_overall_preference_score" INTEGER,
  "public_aroma_body_foam_score" INTEGER,
  "public_entry_acceptance_score" INTEGER,
  "public_willing_to_drink_score" INTEGER,
  "public_comment" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "scores_beer_judge_user_key" ON "scores"("beer_id", "judge_user_id");
CREATE INDEX "scores_beer_judge_type_idx" ON "scores"("beer_id", "judge_type_snapshot");
```

- [ ] **Step 5: Update user types, repository, mapper, routes**

Modify `apps/api/src/modules/users/users.types.ts`:

```ts
import type { JudgeType } from "@bjcp-arena/contracts";

export interface StoredUser {
  id: number;
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
  judgeType: JudgeType | null;
  disabled: boolean;
  authVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoredUserInput {
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
  judgeType?: JudgeType | null;
}
```

Modify `apps/api/src/modules/users/users.repository.ts`:

```ts
import type { JudgeType } from "@bjcp-arena/contracts";

export interface UpdateStoredUserInput {
  username?: string;
  nickname?: string;
  roles?: number;
  judgeType?: JudgeType | null;
  disabled?: boolean;
}
```

In memory `createUser`, include:

```ts
judgeType: input.judgeType ?? null,
```

In `shouldBumpAuthVersion`, include judge type because it affects scoring behavior:

```ts
(input.judgeType !== undefined && input.judgeType !== user.judgeType)
```

Modify `apps/api/src/modules/users/user-mapper.ts` so `toPublicUser` includes:

```ts
judgeType: user.judgeType,
```

Modify `apps/api/src/modules/users/users.routes.ts`:

```ts
function toUpdateStoredUserInput(input: ReturnType<typeof updateUserInputSchema.parse>) {
  const update: UpdateStoredUserInput = {};

  if (input.username !== undefined) {
    update.username = input.username;
  }
  if (input.nickname !== undefined) {
    update.nickname = input.nickname;
  }
  if (input.roles !== undefined) {
    update.roles = input.roles;
  }
  if (input.judgeType !== undefined) {
    update.judgeType = input.judgeType;
  }
  if (input.disabled !== undefined) {
    update.disabled = input.disabled;
  }

  return update;
}
```

In create route data:

```ts
judgeType: input.judgeType ?? null,
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- users.routes.test.ts user-repository.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit checkpoint if user asked for commits**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/0002_create_competition_loop/migration.sql apps/api/src/modules/users apps/api/test/integration/users.routes.test.ts apps/api/test/unit/user-repository.test.ts
git commit -m "feat(api): 增加评委类型和比赛闭环数据表"
```

## Task 4: API Repositories And Services For Competitions And Beers

**Files:**
- Create: `apps/api/src/modules/competitions/competitions.types.ts`
- Create: `apps/api/src/modules/competitions/competitions.repository.ts`
- Create: `apps/api/src/modules/competitions/competition-mapper.ts`
- Create: `apps/api/src/modules/beers/beers.types.ts`
- Create: `apps/api/src/modules/beers/beers.repository.ts`
- Create: `apps/api/src/modules/beers/beers.service.ts`
- Create: `apps/api/src/modules/beers/beer-mapper.ts`
- Test: `apps/api/test/unit/beers-service.test.ts`

- [ ] **Step 1: Write failing beer entry number test**

Create `apps/api/test/unit/beers-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMemoryBeerRepository } from "../../src/modules/beers/beers.repository.js";
import { createBeerService } from "../../src/modules/beers/beers.service.js";

describe("beer service", () => {
  it("assigns entry numbers per competition and never reuses removed numbers", async () => {
    const beers = createMemoryBeerRepository();
    const service = createBeerService({ beers });

    const first = await service.createBeer(1, {
      realName: "Beer A",
      producer: "Brewery",
      bjcpSubcategoryCode: "10A",
      description: "A",
    });
    const second = await service.createBeer(1, {
      realName: "Beer B",
      producer: "Brewery",
      bjcpSubcategoryCode: "21A",
      description: "B",
    });

    await service.updateBeerStatus(1, second.id, "removed");

    const third = await service.createBeer(1, {
      realName: "Beer C",
      producer: "Brewery",
      bjcpSubcategoryCode: "21B",
      description: "C",
    });

    expect(first.entryNumber).toBe(1);
    expect(second.entryNumber).toBe(2);
    expect(third.entryNumber).toBe(3);
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- beers-service.test.ts
```

Expected: FAIL because beer repository/service do not exist.

- [ ] **Step 3: Create competition repository and mapper**

Create `apps/api/src/modules/competitions/competitions.types.ts`:

```ts
import type { CompetitionStatus } from "@bjcp-arena/contracts";

export interface StoredCompetition {
  id: number;
  name: string;
  description: string | null;
  status: CompetitionStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

Create `apps/api/src/modules/competitions/competition-mapper.ts`:

```ts
import type { StoredCompetition } from "./competitions.types.js";

export function toCompetitionResult(competition: StoredCompetition) {
  return {
    ...competition,
    createdAt: competition.createdAt.toISOString(),
    updatedAt: competition.updatedAt.toISOString(),
  };
}
```

Create `apps/api/src/modules/competitions/competitions.repository.ts` with memory and Prisma implementations:

```ts
import type { PrismaClient } from "@prisma/client";
import type {
  CompetitionStatus,
  CreateCompetitionInput,
  UpdateCompetitionInput,
} from "@bjcp-arena/contracts";
import type { StoredCompetition } from "./competitions.types.js";

export interface CompetitionRepository {
  listCompetitions(): Promise<StoredCompetition[]>;
  findCompetition(id: number): Promise<StoredCompetition | null>;
  createCompetition(input: CreateCompetitionInput): Promise<StoredCompetition>;
  updateCompetition(id: number, input: UpdateCompetitionInput): Promise<StoredCompetition | null>;
  updateCompetitionStatus(id: number, status: CompetitionStatus): Promise<StoredCompetition | null>;
}

export function createPrismaCompetitionRepository(prisma: PrismaClient): CompetitionRepository {
  return {
    listCompetitions() {
      return prisma.competition.findMany({ orderBy: { id: "desc" } }) as Promise<StoredCompetition[]>;
    },
    findCompetition(id) {
      return prisma.competition.findUnique({ where: { id } }) as Promise<StoredCompetition | null>;
    },
    createCompetition(input) {
      return prisma.competition.create({
        data: { name: input.name, description: input.description ?? null },
      }) as Promise<StoredCompetition>;
    },
    async updateCompetition(id, input) {
      try {
        return (await prisma.competition.update({ where: { id }, data: input })) as StoredCompetition;
      } catch {
        return null;
      }
    },
    async updateCompetitionStatus(id, status) {
      try {
        return (await prisma.competition.update({ where: { id }, data: { status } })) as StoredCompetition;
      } catch {
        return null;
      }
    },
  };
}

export function createMemoryCompetitionRepository(): CompetitionRepository {
  const competitions = new Map<number, StoredCompetition>();
  let nextId = 1;
  const now = () => new Date("2026-06-14T00:00:00.000Z");

  return {
    async listCompetitions() {
      return Array.from(competitions.values()).sort((a, b) => b.id - a.id);
    },
    async findCompetition(id) {
      return competitions.get(id) ?? null;
    },
    async createCompetition(input) {
      const createdAt = now();
      const competition: StoredCompetition = {
        id: nextId++,
        name: input.name,
        description: input.description ?? null,
        status: "draft",
        createdAt,
        updatedAt: createdAt,
      };
      competitions.set(competition.id, competition);
      return competition;
    },
    async updateCompetition(id, input) {
      const current = competitions.get(id);
      if (!current) return null;
      const updated = { ...current, ...input, updatedAt: now() };
      competitions.set(id, updated);
      return updated;
    },
    async updateCompetitionStatus(id, status) {
      const current = competitions.get(id);
      if (!current) return null;
      const updated = { ...current, status, updatedAt: now() };
      competitions.set(id, updated);
      return updated;
    },
  };
}
```

- [ ] **Step 4: Create beer repository, mapper, service**

Create `apps/api/src/modules/beers/beers.types.ts`:

```ts
import type { BeerStatus } from "@bjcp-arena/contracts";

export interface StoredBeer {
  id: number;
  competitionId: number;
  entryNumber: number;
  realName: string;
  producer: string;
  bjcpCategoryCode: string;
  bjcpCategoryName: string;
  bjcpSubcategoryCode: string;
  bjcpSubcategoryName: string;
  description: string;
  status: BeerStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

Create `apps/api/src/modules/beers/beer-mapper.ts`:

```ts
import type { StoredBeer } from "./beers.types.js";

export function toBeerResult(beer: StoredBeer) {
  return {
    ...beer,
    createdAt: beer.createdAt.toISOString(),
    updatedAt: beer.updatedAt.toISOString(),
  };
}
```

Create `apps/api/src/modules/beers/beers.repository.ts`:

```ts
import type { PrismaClient } from "@prisma/client";
import type { BeerStatus } from "@bjcp-arena/contracts";
import type { StoredBeer } from "./beers.types.js";

export interface CreateStoredBeerInput extends Omit<StoredBeer, "id" | "createdAt" | "updatedAt"> {}
export type UpdateStoredBeerInput = Partial<
  Pick<
    StoredBeer,
    | "realName"
    | "producer"
    | "bjcpCategoryCode"
    | "bjcpCategoryName"
    | "bjcpSubcategoryCode"
    | "bjcpSubcategoryName"
    | "description"
  >
>;

export interface BeerRepository {
  listBeers(competitionId: number): Promise<StoredBeer[]>;
  listPublishedBeers(competitionId: number): Promise<StoredBeer[]>;
  findBeer(competitionId: number, beerId: number): Promise<StoredBeer | null>;
  findMaxEntryNumber(competitionId: number): Promise<number>;
  createBeer(input: CreateStoredBeerInput): Promise<StoredBeer>;
  updateBeer(competitionId: number, beerId: number, input: UpdateStoredBeerInput): Promise<StoredBeer | null>;
  updateBeerStatus(competitionId: number, beerId: number, status: BeerStatus): Promise<StoredBeer | null>;
}

export function createPrismaBeerRepository(prisma: PrismaClient): BeerRepository {
  return {
    listBeers(competitionId) {
      return prisma.beerEntry.findMany({ where: { competitionId }, orderBy: { entryNumber: "asc" } }) as Promise<StoredBeer[]>;
    },
    listPublishedBeers(competitionId) {
      return prisma.beerEntry.findMany({
        where: { competitionId, status: "published" },
        orderBy: { entryNumber: "asc" },
      }) as Promise<StoredBeer[]>;
    },
    findBeer(competitionId, beerId) {
      return prisma.beerEntry.findFirst({ where: { id: beerId, competitionId } }) as Promise<StoredBeer | null>;
    },
    async findMaxEntryNumber(competitionId) {
      const result = await prisma.beerEntry.aggregate({
        where: { competitionId },
        _max: { entryNumber: true },
      });
      return result._max.entryNumber ?? 0;
    },
    createBeer(input) {
      return prisma.beerEntry.create({ data: input }) as Promise<StoredBeer>;
    },
    async updateBeer(competitionId, beerId, input) {
      const current = await prisma.beerEntry.findFirst({ where: { id: beerId, competitionId } });
      if (!current) return null;
      return prisma.beerEntry.update({ where: { id: beerId }, data: input }) as Promise<StoredBeer>;
    },
    async updateBeerStatus(competitionId, beerId, status) {
      const current = await prisma.beerEntry.findFirst({ where: { id: beerId, competitionId } });
      if (!current) return null;
      return prisma.beerEntry.update({ where: { id: beerId }, data: { status } }) as Promise<StoredBeer>;
    },
  };
}

export function createMemoryBeerRepository(): BeerRepository {
  const beers = new Map<number, StoredBeer>();
  let nextId = 1;
  const now = () => new Date("2026-06-14T00:00:00.000Z");

  return {
    async listBeers(competitionId) {
      return Array.from(beers.values())
        .filter((beer) => beer.competitionId === competitionId)
        .sort((a, b) => a.entryNumber - b.entryNumber);
    },
    async listPublishedBeers(competitionId) {
      return (await this.listBeers(competitionId)).filter((beer) => beer.status === "published");
    },
    async findBeer(competitionId, beerId) {
      const beer = beers.get(beerId);
      return beer?.competitionId === competitionId ? beer : null;
    },
    async findMaxEntryNumber(competitionId) {
      return Array.from(beers.values())
        .filter((beer) => beer.competitionId === competitionId)
        .reduce((max, beer) => Math.max(max, beer.entryNumber), 0);
    },
    async createBeer(input) {
      const createdAt = now();
      const beer = { ...input, id: nextId++, createdAt, updatedAt: createdAt };
      beers.set(beer.id, beer);
      return beer;
    },
    async updateBeer(competitionId, beerId, input) {
      const beer = await this.findBeer(competitionId, beerId);
      if (!beer) return null;
      const updated = { ...beer, ...input, updatedAt: now() };
      beers.set(beerId, updated);
      return updated;
    },
    async updateBeerStatus(competitionId, beerId, status) {
      const beer = await this.findBeer(competitionId, beerId);
      if (!beer) return null;
      const updated = { ...beer, status, updatedAt: now() };
      beers.set(beerId, updated);
      return updated;
    },
  };
}
```

Create `apps/api/src/modules/beers/beers.service.ts`:

```ts
import {
  findBjcpSubcategory,
  type BeerStatus,
  type CreateBeerInput,
  type UpdateBeerInput,
} from "@bjcp-arena/contracts";
import type { BeerRepository } from "./beers.repository.js";

export class BeerStyleNotFoundError extends Error {}

export function createBeerService(dependencies: { beers: BeerRepository }) {
  const { beers } = dependencies;

  function styleSnapshot(code: string) {
    const style = findBjcpSubcategory(code);
    if (!style) {
      throw new BeerStyleNotFoundError("BJCP style not found");
    }
    return style;
  }

  return {
    async createBeer(competitionId: number, input: CreateBeerInput) {
      const style = styleSnapshot(input.bjcpSubcategoryCode);
      const nextEntryNumber = (await beers.findMaxEntryNumber(competitionId)) + 1;

      return beers.createBeer({
        competitionId,
        entryNumber: nextEntryNumber,
        realName: input.realName,
        producer: input.producer,
        description: input.description,
        status: "draft",
        ...style,
      });
    },

    async updateBeer(competitionId: number, beerId: number, input: UpdateBeerInput) {
      const style = input.bjcpSubcategoryCode ? styleSnapshot(input.bjcpSubcategoryCode) : {};
      return beers.updateBeer(competitionId, beerId, {
        ...input,
        ...style,
      });
    },

    updateBeerStatus(competitionId: number, beerId: number, status: BeerStatus) {
      return beers.updateBeerStatus(competitionId, beerId, status);
    },
  };
}
```

- [ ] **Step 5: Run service tests**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- beers-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit checkpoint if user asked for commits**

```bash
git add apps/api/src/modules/competitions apps/api/src/modules/beers apps/api/test/unit/beers-service.test.ts
git commit -m "feat(api): 增加比赛和酒款数据访问"
```

## Task 5: API Routes For Competitions And Beers

**Files:**
- Create: `apps/api/src/shared/http/auth-guards.ts`
- Create: `apps/api/src/modules/competitions/competitions.routes.ts`
- Create: `apps/api/src/modules/beers/beers.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/integration/competitions.routes.test.ts`
- Test: `apps/api/test/integration/beers.routes.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `apps/api/test/integration/competitions.routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  competitionListPath,
  competitionResultSchema,
  competitionStatusPath,
} from "@bjcp-arena/contracts";
import { createTestApp } from "../helpers/create-test-app.js";

async function bootstrapToken(app: ReturnType<typeof createTestApp>["app"]) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/bootstrap-super-admin",
    payload: { password: "secret123" },
  });
  return response.json().token as string;
}

describe("competition routes", () => {
  it("allows admins to create, list, and change competition status", async () => {
    const { app } = createTestApp();
    const token = await bootstrapToken(app);

    const created = await app.inject({
      method: "POST",
      url: competitionListPath,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "夏季赛", description: "第一场" },
    });

    expect(created.statusCode).toBe(200);
    const competition = competitionResultSchema.parse(created.json()).competition;
    expect(competition.status).toBe("draft");

    const status = await app.inject({
      method: "PATCH",
      url: competitionStatusPath(competition.id),
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "judging" },
    });

    expect(status.statusCode).toBe(200);
    expect(competitionResultSchema.parse(status.json()).competition.status).toBe("judging");
    await app.close();
  });
});
```

Create `apps/api/test/integration/beers.routes.test.ts` with a test that creates a competition, creates two beers, removes the second, creates a third, and asserts entry numbers 1, 2, 3.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- competitions.routes.test.ts beers.routes.test.ts
```

Expected: FAIL because routes are not registered.

- [ ] **Step 3: Create auth guards**

Create `apps/api/src/shared/http/auth-guards.ts`:

```ts
import type { FastifyRequest } from "fastify";
import { canAccessAdminApp, judgeRole } from "@bjcp-arena/contracts";
import { AuthError, type createAuthService } from "../../modules/auth/auth.service.js";

type AuthService = ReturnType<typeof createAuthService>;

export async function requireAdmin(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if (!canAccessAdminApp(currentUser.roles)) {
    throw new AuthError("Forbidden", 403);
  }
  return currentUser;
}

export async function requireJudge(auth: AuthService, request: FastifyRequest) {
  const currentUser = await auth.authenticate(request.headers.authorization);
  if ((currentUser.roles & judgeRole) !== judgeRole) {
    throw new AuthError("Forbidden", 403);
  }
  return currentUser;
}
```

- [ ] **Step 4: Create routes and register them**

Create `apps/api/src/modules/competitions/competitions.routes.ts` and `apps/api/src/modules/beers/beers.routes.ts` following the existing `users.routes.ts` pattern:

- Parse IDs from params as positive integers.
- Use contracts schemas for request and response.
- Map `AuthError` to its status.
- Return `404` for missing competition or beer.
- Require admin for all后台 competition and beer routes.
- For `GET /qr-codes`, use `listPublishedBeers` and build judge URL from config.

Modify `apps/api/src/config.ts` to include:

```ts
judgeAppBaseUrl: process.env.JUDGE_APP_BASE_URL ?? "http://localhost:5174",
```

Modify `apps/api/src/app.ts` to create repositories/services and register:

```ts
registerCompetitionRoutes(app, { auth, competitions });
registerBeerRoutes(app, { auth, beers, beerService, judgeAppBaseUrl: config.judgeAppBaseUrl });
```

- [ ] **Step 5: Run route tests**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- competitions.routes.test.ts beers.routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit checkpoint if user asked for commits**

```bash
git add apps/api/src/shared apps/api/src/modules/competitions apps/api/src/modules/beers apps/api/src/app.ts apps/api/src/config.ts apps/api/test/integration/competitions.routes.test.ts apps/api/test/integration/beers.routes.test.ts
git commit -m "feat(api): 增加比赛和酒款接口"
```

## Task 6: Scores, Summary, And SSE

**Files:**
- Create: `apps/api/src/modules/scores/scores.types.ts`
- Create: `apps/api/src/modules/scores/scores.repository.ts`
- Create: `apps/api/src/modules/scores/scores.service.ts`
- Create: `apps/api/src/modules/scores/score-events.ts`
- Create: `apps/api/src/modules/scores/score-summary.ts`
- Create: `apps/api/src/modules/scores/scores.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/test/unit/score-summary.test.ts`
- Test: `apps/api/test/integration/scores.routes.test.ts`

- [ ] **Step 1: Write failing summary unit test**

Create `apps/api/test/unit/score-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeBeerScores } from "../../src/modules/scores/score-summary.js";

describe("score summary", () => {
  it("keeps professional and public score aggregates separate", () => {
    const summary = summarizeBeerScores([
      { judgeTypeSnapshot: "professional", professionalTotalScore: 40 },
      { judgeTypeSnapshot: "professional", professionalTotalScore: 30 },
      {
        judgeTypeSnapshot: "public",
        publicOverallPreferenceScore: 8,
        publicAromaBodyFoamScore: 4,
        publicEntryAcceptanceScore: 5,
        publicWillingToDrinkScore: 4,
      },
      {
        judgeTypeSnapshot: "public",
        publicOverallPreferenceScore: 6,
        publicAromaBodyFoamScore: 2,
        publicEntryAcceptanceScore: 3,
        publicWillingToDrinkScore: 2,
      },
    ]);

    expect(summary).toEqual({
      professionalJudgeCount: 2,
      professionalAverageTotalScore: 35,
      publicJudgeCount: 2,
      publicAverageOverallPreference: 7,
      publicAverageAromaBodyFoam: 3,
      publicAverageEntryAcceptance: 4,
      publicAverageWillingToDrink: 3,
    });
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- score-summary.test.ts
```

Expected: FAIL because scores module does not exist.

- [ ] **Step 3: Implement score summary**

Create `apps/api/src/modules/scores/score-summary.ts`:

```ts
type SummaryScore = {
  judgeTypeSnapshot: string;
  professionalTotalScore?: number | null;
  publicOverallPreferenceScore?: number | null;
  publicAromaBodyFoamScore?: number | null;
  publicEntryAcceptanceScore?: number | null;
  publicWillingToDrinkScore?: number | null;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeBeerScores(scores: SummaryScore[]) {
  const professional = scores.filter((score) => score.judgeTypeSnapshot === "professional");
  const publicScores = scores.filter((score) => score.judgeTypeSnapshot === "public");

  return {
    professionalJudgeCount: professional.length,
    professionalAverageTotalScore: average(
      professional.flatMap((score) =>
        score.professionalTotalScore === null || score.professionalTotalScore === undefined
          ? []
          : [score.professionalTotalScore]
      )
    ),
    publicJudgeCount: publicScores.length,
    publicAverageOverallPreference: average(publicScores.map((score) => score.publicOverallPreferenceScore ?? 0)),
    publicAverageAromaBodyFoam: average(publicScores.map((score) => score.publicAromaBodyFoamScore ?? 0)),
    publicAverageEntryAcceptance: average(publicScores.map((score) => score.publicEntryAcceptanceScore ?? 0)),
    publicAverageWillingToDrink: average(publicScores.map((score) => score.publicWillingToDrinkScore ?? 0)),
  };
}
```

- [ ] **Step 4: Implement score repository/service/routes**

Create score repository with methods:

```ts
interface ScoreRepository {
  findMyScore(beerId: number, judgeUserId: number): Promise<StoredScore | null>;
  upsertScore(input: UpsertScoreInput): Promise<StoredScore>;
  listScoresForCompetition(competitionId: number): Promise<StoredScore[]>;
}
```

Create service behavior:

- Load competition and beer.
- Require competition `judging`.
- Require beer `published`.
- Require user `judgeType`.
- If `judgeType = professional`, parse professional input and compute total.
- If `judgeType = public`, parse public input and set professional fields to null.
- Upsert by `(beerId, judgeUserId)`.
- Publish `score.updated` event after upsert.

Create `score-events.ts`:

```ts
export type ScoreEvent = {
  type: "score.updated" | "competition.updated" | "beer.updated";
  competitionId: number;
  updatedAt: string;
};

export function createScoreEventHub() {
  const listeners = new Set<(event: ScoreEvent) => void>();
  return {
    publish(event: ScoreEvent) {
      for (const listener of listeners) listener(event);
    },
    subscribe(listener: (event: ScoreEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
```

Routes:

- `GET judgeBeerDetailPath` returns restricted beer detail and `canScore`.
- `GET judgeMyScorePath` returns current user's score or null.
- `PUT judgeMyScorePath` upserts.
- `GET boardCompetitionSummaryPath` returns DB-derived summary.
- `GET boardCompetitionEventsPath` streams SSE messages and keeps connection open.

For SSE route, set headers:

```ts
reply.raw.writeHead(200, {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
});
```

Write events as:

```ts
reply.raw.write(`event: ${event.type}\n`);
reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
```

- [ ] **Step 5: Write integration tests for scoring**

Create `apps/api/test/integration/scores.routes.test.ts` covering:

- Professional judge can submit and gets computed total.
- Public judge can submit public form.
- Repeat submit updates same score id or same `(beerId, judgeUserId)` current record.
- `my-score` returns `submittedAt`.
- Draft competition, closed competition, draft beer, removed beer all reject scoring.
- Judge beer detail does not include `realName` or `producer`.
- Board summary returns separate professional/public aggregates.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @bjcp-arena/api test -- score-summary.test.ts scores.routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit checkpoint if user asked for commits**

```bash
git add apps/api/src/modules/scores apps/api/src/app.ts apps/api/test/unit/score-summary.test.ts apps/api/test/integration/scores.routes.test.ts
git commit -m "feat(api): 增加评分提交和大屏统计"
```

## Task 7: API Client

**Files:**
- Modify: `packages/api-client/src/create-client.ts`
- Test: `packages/api-client/test/create-client.test.ts`

- [ ] **Step 1: Write failing api-client tests**

Add tests to `packages/api-client/test/create-client.test.ts`:

```ts
it("creates competitions with bearer token", async () => {
  const fetcher: FetchLike = vi.fn(async () =>
    jsonResponse({
      competition: {
        id: 1,
        name: "夏季赛",
        description: null,
        status: "draft",
        createdAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:00:00.000Z",
      },
    })
  );
  const client = createApiClient({ baseUrl: "http://localhost:4000", fetch: fetcher, getToken: () => "jwt-token" });

  await client.createCompetition({ name: "夏季赛" });

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
```

Add similar tests for:

- `listCompetitions`
- `createBeer`
- `listBeerQrCodes`
- `getJudgeBeer`
- `getMyScore`
- `submitMyScore`
- `getBoardCompetitionSummary`

- [ ] **Step 2: Run api-client test and confirm failure**

Run:

```bash
pnpm --filter @bjcp-arena/api-client test -- create-client.test.ts
```

Expected: FAIL because methods do not exist.

- [ ] **Step 3: Add methods**

Modify imports in `packages/api-client/src/create-client.ts` to include new paths and schemas.

Add methods inside `createApiClient`:

```ts
listCompetitions() {
  return requestJson(fetcher, options.baseUrl, "GET", competitionListPath, (data) =>
    competitionListResultSchema.parse(data), { token: getToken() });
},
createCompetition(input: CreateCompetitionInput) {
  return requestJson(fetcher, options.baseUrl, "POST", competitionListPath, (data) =>
    competitionResultSchema.parse(data), { body: createCompetitionInputSchema.parse(input), token: getToken() });
},
listBeers(competitionId: number) {
  return requestJson(fetcher, options.baseUrl, "GET", beerListPath(competitionId), (data) =>
    beerListResultSchema.parse(data), { token: getToken() });
},
createBeer(competitionId: number, input: CreateBeerInput) {
  return requestJson(fetcher, options.baseUrl, "POST", beerListPath(competitionId), (data) =>
    beerResultSchema.parse(data), { body: createBeerInputSchema.parse(input), token: getToken() });
},
listBeerQrCodes(competitionId: number) {
  return requestJson(fetcher, options.baseUrl, "GET", beerQrCodesPath(competitionId), (data) =>
    beerQrCodeListResultSchema.parse(data), { token: getToken() });
},
getJudgeBeer(competitionId: number, beerId: number) {
  return requestJson(fetcher, options.baseUrl, "GET", judgeBeerDetailPath(competitionId, beerId), (data) =>
    judgeBeerResultSchema.parse(data), { token: getToken() });
},
getMyScore(competitionId: number, beerId: number) {
  return requestJson(fetcher, options.baseUrl, "GET", judgeMyScorePath(competitionId, beerId), (data) =>
    myScoreResultSchema.parse(data), { token: getToken() });
},
submitMyScore(competitionId: number, beerId: number, input: ScoreInput) {
  return requestJson(fetcher, options.baseUrl, "PUT", judgeMyScorePath(competitionId, beerId), (data) =>
    submitMyScoreResultSchema.parse(data), { body: scoreInputSchema.parse(input), token: getToken() });
},
getBoardCompetitionSummary(competitionId: number) {
  return requestJson(fetcher, options.baseUrl, "GET", boardCompetitionSummaryPath(competitionId), (data) =>
    boardCompetitionSummarySchema.parse(data));
},
```

If `Method` currently excludes `PUT`, update:

```ts
type Method = "GET" | "POST" | "PATCH" | "PUT";
```

- [ ] **Step 4: Run api-client tests**

Run:

```bash
pnpm --filter @bjcp-arena/api-client test
```

Expected: PASS.

- [ ] **Step 5: Commit checkpoint if user asked for commits**

```bash
git add packages/api-client/src/create-client.ts packages/api-client/test/create-client.test.ts
git commit -m "feat(api-client): 接入比赛酒款评分接口"
```

## Task 8: Admin Frontend

**Files:**
- Modify: `apps/admin/src/app/App.tsx`
- Modify: `apps/admin/src/layouts/AdminLayout.tsx`
- Create: `apps/admin/src/pages/competitions/CompetitionsPage.tsx`
- Create: `apps/admin/src/pages/competitions/CompetitionDetailPage.tsx`
- Create: `apps/admin/src/pages/competitions/QrCodesPage.tsx`
- Create: `apps/admin/src/modules/competitions/competitions-api.ts`
- Create: `apps/admin/src/modules/competitions/components/BeerForm.tsx`
- Create: `apps/admin/src/modules/competitions/components/CompetitionForm.tsx`
- Create: `apps/admin/src/modules/competitions/components/QrCodeCard.tsx`

- [ ] **Step 1: Add admin API helper**

Create `apps/admin/src/modules/competitions/competitions-api.ts`:

```ts
import { api } from "../../app/api";

export const competitionsApi = {
  listCompetitions: () => api.listCompetitions(),
  createCompetition: api.createCompetition,
  listBeers: api.listBeers,
  createBeer: api.createBeer,
  listBeerQrCodes: api.listBeerQrCodes,
};
```

- [ ] **Step 2: Add competition list page**

Create `apps/admin/src/pages/competitions/CompetitionsPage.tsx` with:

- Page header “比赛管理”。
- `useEffect` calls `api.listCompetitions()`.
- Create form with `name` and `description`.
- List cards/table linking to competition detail.
- Error state using existing `InlineMessage`.

- [ ] **Step 3: Add competition detail page**

Create `CompetitionDetailPage.tsx` with:

- Load competition and beers by route param.
- Status segmented control or select: draft/judging/closed/published.
- Beer form fields: realName, producer, bjcpSubcategoryCode, description.
- Beer table showing entryNumber, realName, producer, BJCP type, status.
- Buttons to set beer status draft/published/removed.
- Link to QR wall.

- [ ] **Step 4: Add QR wall**

Create `QrCodesPage.tsx` and `QrCodeCard.tsx`.

Use a small dependency only if needed:

```bash
pnpm --filter @bjcp-arena/admin add qrcode.react
```

If dependency install is blocked by network, fallback: render the `judgeUrl` as copyable text in MVP and note QR rendering remains pending.

`QrCodeCard` displays only published beers returned by `listBeerQrCodes`:

```tsx
<Card>
  <Title order={3}>酒款 #{beer.entryNumber}</Title>
  <Text>{beer.realName}</Text>
  <Text>{beer.producer}</Text>
  <Text>{beer.bjcpSubcategoryCode} {beer.bjcpSubcategoryName}</Text>
  <QRCodeSVG value={beer.judgeUrl} />
  <Text size="xs">{beer.judgeUrl}</Text>
</Card>
```

- [ ] **Step 5: Wire routes and navigation**

Modify `apps/admin/src/app/App.tsx` to add:

```text
/competitions
/competitions/:competitionId
/competitions/:competitionId/qr-codes
```

Modify `AdminLayout.tsx` navigation to add “比赛管理”.

- [ ] **Step 6: Typecheck admin**

Run:

```bash
pnpm --filter @bjcp-arena/admin typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit checkpoint if user asked for commits**

```bash
git add apps/admin
git commit -m "feat(admin): 增加比赛酒款管理和二维码墙"
```

## Task 9: Judge Frontend

**Files:**
- Modify: `apps/judge/src/app/App.tsx`
- Create: `apps/judge/src/pages/scoring/ScoringPage.tsx`
- Create: `apps/judge/src/modules/scoring/ProfessionalScoreForm.tsx`
- Create: `apps/judge/src/modules/scoring/PublicScoreForm.tsx`
- Create: `apps/judge/src/modules/scoring/scoring-api.ts`

- [ ] **Step 1: Add scoring API helper**

Create `apps/judge/src/modules/scoring/scoring-api.ts`:

```ts
import { api } from "../../app/api";

export const scoringApi = {
  getJudgeBeer: api.getJudgeBeer,
  getMyScore: api.getMyScore,
  submitMyScore: api.submitMyScore,
};
```

- [ ] **Step 2: Add scoring page**

Create `ScoringPage.tsx`:

- Read `competitionId` and `beerId` route params.
- Ensure session restore follows existing judge app pattern.
- Load restricted beer detail and my score.
- Display “酒款 #N”, BJCP type, description.
- If `score` exists, show last submitted time:

```tsx
<Alert color="blue">
  你已于 {new Date(score.submittedAt).toLocaleString()} 提交过，本次提交会覆盖上次评分。
</Alert>
```

- If `beer.canScore` is false, show status warning and disable submit.
- Choose form by current user `judgeType`.
- If current user has no judgeType, show “当前账号未设置评委类型，请联系管理员”。

- [ ] **Step 3: Add professional form**

Create `ProfessionalScoreForm.tsx` with Mantine number inputs:

- aroma 0-12
- appearance 0-3
- flavor 0-20
- mouthfeel 0-5
- overall 0-10
- comment fields
- computed total shown as read-only text

On submit, call:

```ts
submitMyScore(competitionId, beerId, {
  judgeType: "professional",
  professionalAromaScore,
  professionalAppearanceScore,
  professionalFlavorScore,
  professionalMouthfeelScore,
  professionalOverallScore,
  professionalOverallComment,
});
```

- [ ] **Step 4: Add public form**

Create `PublicScoreForm.tsx` with Mantine sliders or number inputs:

- overall preference 1-10
- aroma/body/foam 1-5
- entry acceptance 1-5
- willing to drink 1-5
- comment

On submit, call:

```ts
submitMyScore(competitionId, beerId, {
  judgeType: "public",
  publicOverallPreferenceScore,
  publicAromaBodyFoamScore,
  publicEntryAcceptanceScore,
  publicWillingToDrinkScore,
  publicComment,
});
```

- [ ] **Step 5: Wire route**

Modify `apps/judge/src/app/App.tsx`:

```text
/competitions/:competitionId/beers/:beerId
```

- [ ] **Step 6: Typecheck judge**

Run:

```bash
pnpm --filter @bjcp-arena/judge typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit checkpoint if user asked for commits**

```bash
git add apps/judge
git commit -m "feat(judge): 增加扫码评分页面"
```

## Task 10: Board Frontend

**Files:**
- Modify: `apps/board/src/app/App.tsx`
- Modify: `apps/board/src/pages/board/BoardPage.tsx`
- Modify: `apps/board/src/pages/board/BoardPage.module.css`

- [ ] **Step 1: Add route param support**

Modify board app routing so `/competitions/:competitionId` renders `BoardPage`.

- [ ] **Step 2: Implement summary loading**

In `BoardPage.tsx`:

- Read `competitionId`.
- Call `api.getBoardCompetitionSummary(Number(competitionId))`.
- Render competition name/status, beer count, updatedAt.
- Render each beer summary.

- [ ] **Step 3: Implement SSE invalidation**

In `BoardPage.tsx`, add effect:

```ts
useEffect(() => {
  const source = new EventSource(`${env.apiBaseUrl}/api/board/competitions/${competitionId}/events`);
  source.addEventListener("score.updated", refreshSummary);
  source.addEventListener("competition.updated", refreshSummary);
  source.addEventListener("beer.updated", refreshSummary);
  source.addEventListener("open", refreshSummary);
  source.addEventListener("error", () => {
    refreshSummary();
  });
  const intervalId = window.setInterval(refreshSummary, 30000);
  return () => {
    window.clearInterval(intervalId);
    source.close();
  };
}, [competitionId, refreshSummary]);
```

Do not increment local counts from events. Always reload summary.

- [ ] **Step 4: Render anonymous/public fields**

For each beer:

- Always show `酒款 #entryNumber` and BJCP type.
- Show `realName` and `producer` only when summary returns non-null values.
- Show professional count and average total.
- Show public count and public averages.

- [ ] **Step 5: Typecheck board**

Run:

```bash
pnpm --filter @bjcp-arena/board typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit checkpoint if user asked for commits**

```bash
git add apps/board
git commit -m "feat(board): 增加比赛实时看板"
```

## Task 11: Verification And Manual Smoke

**Files:**
- Modify if needed: `docs/testing.md`
- No production code unless verification exposes a defect.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test:contracts
pnpm test:api-client
pnpm test:api
```

Expected: all PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm verify
```

Expected: lint, typecheck, test, build all PASS.

- [ ] **Step 3: Start local app for smoke**

Run:

```bash
pnpm dev
```

Expected:

- API on `http://localhost:4000`
- admin on `http://localhost:5173`
- judge on `http://localhost:5174`
- board on `http://localhost:5175`

- [ ] **Step 4: Manual smoke checklist**

In browser:

- Admin creates competition.
- Admin creates three beers and confirms entry numbers 1, 2, 3.
- Admin removes beer #2, creates another beer, confirms new beer is #4.
- Admin publishes beer #1 and #3.
- QR wall only shows published beers.
- Judge logs in with professional judge type and scores beer #1.
- Judge page shows submitted time after first submission.
- Judge submits again and sees same score updated.
- Public judge scores beer #3.
- Board `/competitions/:competitionId` refreshes after each score.
- Closing competition prevents further score submission.
- Publishing competition allows board to show real name and producer.

- [ ] **Step 5: Update testing docs if commands or smoke steps changed**

If the implementation adds QR wall or board smoke steps, append them to `docs/testing.md` under “人工 UI 冒烟检查”.

- [ ] **Step 6: Final git status**

Run:

```bash
git status --short
```

Expected: only intentional files are modified. `.superpowers/` visual brainstorming files should not be staged for product changes.

- [ ] **Step 7: Commit checkpoint if user asked for commits**

Use one or several Chinese Conventional Commit messages depending on how the user wants to group changes, for example:

```bash
git add packages apps docs
git commit -m "feat(competition-loop): 打通啤酒比赛最小闭环"
```
