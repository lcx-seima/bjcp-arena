## 首先语言

无论对话、落文档、还是 SKILLS（如 superpowers）等，均使用中文对话和输出内容

## 项目定位

`bjcp-arena` 是啤酒评鉴系统的 monorepo。当前阶段只维护工程底座和 hello-world 联通链路，不提前实现评鉴会、裁判、酒款、评分等业务逻辑。

## Monorepo 约定

- 包管理器：`pnpm`
- 工作区结构：`apps/*` 和 `packages/*`
- 服务端：`apps/api`
- 后台管理端：`apps/admin`
- 裁判 H5 端：`apps/judge`
- 共享契约：`packages/contracts`
- 共享 API 客户端：`packages/api-client`

## Git 工作树约束

- 除非用户主动要求使用 `git worktree`，否则默认不创建、不切换额外 worktree。
- 代码和文档变更默认直接在当前主仓库工作区内进行。

## 开发原则

- 接口结构优先写到 `packages/contracts`，再由 API 和前端共同消费。
- `packages/api-client` 保持框架无关，不绑定 React。
- 前端本地开发不使用 Vite proxy，始终通过真实 HTTP 地址访问 API。
- 当前不建立 `.codex/skills/*`，需要沉淀的说明优先写入 `docs/*`。
- 不提前引入复杂业务抽象、实时通道或评鉴业务 ORM schema。
- 后端代码组织详见 `docs/backend.md`，需要修改 `apps/api` 时先读取。
- 前端代码组织、Mantine 使用和样式策略详见 `docs/frontend.md`，需要修改 `apps/admin` 或 `apps/judge` 时先读取。
- 测试边界和 UI 冒烟方式详见 `docs/testing.md`。

## 数据库与 Prisma 迁移约束

- 只要字段语义上引用本数据库中确定表的主键，就必须在 Prisma Schema 中建立 `@relation`，并在数据库迁移中生成真实外键；不得只保留普通 `xxxId` 字段。确实不能建立外键时，必须说明原因。
- 所有 Prisma relation 必须显式声明引用动作，不依赖 Prisma 或 PostgreSQL 默认值：
  - 默认使用 `onDelete: Restrict`。它表示父记录仍被子记录引用时，禁止物理删除父记录；不影响删除子记录，也不影响通过更新 `deleted_at` 实现的软删除。
  - 默认使用 `onUpdate: Cascade`。
  - 使用 `Cascade`、`SetNull` 等其他删除策略时，必须有明确的业务生命周期依据。
- 修改表、字段、关系、索引或约束时，必须同时提交 `apps/api/prisma/schema.prisma` 和对应的 `apps/api/prisma/migrations/*/migration.sql`。
- 创建迁移后必须检查生成的 SQL。新增关联字段时，确认 migration 中包含对应的 `FOREIGN KEY`、`REFERENCES`、`ON DELETE` 和 `ON UPDATE`。
- 禁止修改已经提交或已经在任一数据库执行过的 migration；需要修正时新增后续 repair migration。
- 不使用 `prisma db push` 代替正式 migration。开发环境使用 `db:migrate` 创建和应用迁移，部署环境使用 `db:deploy`。
- 完成数据库结构修改前，至少运行：
  - `pnpm --filter @bjcp-arena/api db:migrate`
  - `pnpm --filter @bjcp-arena/api exec prisma migrate status --schema prisma/schema.prisma`
  - `pnpm verify`
- `db:migrate`、`db:deploy` 会修改数据库，Agent 执行前必须明确告知用户；`migrate status` 属于只读检查。

## 提交约束

- 提交信息必须使用中文书写，并符合 Conventional Commits，并包含准确的 scope 信息，例如 `feat(api): ...`、`fix(contracts): ...`。
- 除非用户明确要求，否则不要在完成代码或文档修改后自动执行 `git commit`；是否提交以及何时提交交给用户决定。
- 用户要求提交的时候，准备好 commit message 供用户审阅，优先使用内置选择 UI，而不是纯文本提问

## 常用命令

```bash
pnpm install
pnpm infra:up
pnpm dev
pnpm verify
```

单独启动：

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:judge
```

## 测试边界

自动化测试聚焦 API、contracts、api-client。当前不做 E2E、React 组件测试、截图测试、视觉回归或 Storybook 测试体系。UI 验收采用人工 smoke，详见 `docs/testing.md`。


## 特别注意

不要随便运行 `docker compose down -v` 这种可能删除 data volumes 的方法，必须再三确认！
