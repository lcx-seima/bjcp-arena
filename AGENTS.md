使用中文和我对话。

## 项目定位

`bjcp-arena` 是啤酒评鉴系统的 monorepo。当前阶段只维护工程底座和 hello-world 联通链路，不提前实现评鉴会、裁判、酒款、评分等业务逻辑。

## Monorepo 约定

- 包管理器：`pnpm`
- 工作区结构：`apps/*` 和 `packages/*`
- 服务端：`apps/api`
- 后台管理端：`apps/admin`
- 裁判 H5 端：`apps/judge`
- 实时大盘端：`apps/board`
- 共享契约：`packages/contracts`
- 共享 API 客户端：`packages/api-client`

## 开发原则

- 接口结构优先写到 `packages/contracts`，再由 API 和前端共同消费。
- `packages/api-client` 保持框架无关，不绑定 React。
- 前端本地开发不使用 Vite proxy，始终通过真实 HTTP 地址访问 API。
- 当前不建立 `.codex/skills/*`，需要沉淀的说明优先写入 `docs/*`。
- 不提前引入复杂业务抽象、实时通道、认证体系、ORM schema 或组件库。

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
pnpm dev:board
```

## 测试边界

自动化测试聚焦 API、contracts、api-client。当前不做 E2E、React 组件测试、截图测试、视觉回归或 Storybook 测试体系。UI 验收采用人工 smoke，详见 `docs/testing.md`。
