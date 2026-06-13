# BJCP Arena 架构

## 概览

本仓库是啤酒评鉴系统的 pnpm monorepo。当前目标是搭好可联通的工程底座：一个 API、三个前端入口、共享契约，以及共享 API 客户端。

## 工作区结构

```text
apps/
  api/      Fastify HTTP API
  admin/    PC 后台管理端
  judge/    移动端 H5 裁判端
  board/    实时大盘端

packages/
  contracts/   共享 API 路径、schema 和 TypeScript 类型
  api-client/  框架无关的 HTTP 客户端
  configs/     共享 TypeScript、ESLint 和 Prettier 配置
  utils/       确有需要时放置小型共享工具
```

## 数据流

API 负责运行时行为。`packages/contracts` 负责公开的请求和响应结构。`packages/api-client` 消费这些契约，并暴露框架无关的调用方法。

前端应用始终通过真实 HTTP 基础地址调用 API：

```text
admin/judge/board -> @bjcp-arena/api-client -> http://<api-host>:4000/api/*
```

项目刻意不使用 Vite 开发代理。本地开发应暴露与正式评鉴现场相同的 CORS 和局域网地址问题。

## 当前范围

当前范围包含工程底座和基础用户模块：

- `GET /api/ping`
- PostgreSQL、Prisma 和用户表
- JWT 登录态和 Redis 认证用户快照
- 后台初始化、登录和账号管理
- 裁判端登录和当前用户信息
- `board` 现有页面和 API 可达检查
- 本地开发和测试预期文档

以下内容有意延后：

- 评鉴会领域模型
- 实时大盘传输通道
- 生产部署打包
- 组件库或设计系统

## 认证与账号

用户数据保存在 PostgreSQL，由 `apps/api` 通过 Prisma 访问。数据库迁移只覆盖当前基础用户模块需要的 `users` 表，不提前建立评鉴会、酒款、评分等业务 schema。

登录成功后，API 签发有效期 7 天的 JWT。前端将 token 保存在 `localStorage`，并在认证请求中通过 `Authorization: Bearer <token>` 发送。公开认证接口不携带 token。

JWT 只保存 `sub` 和签发时的 `authVersion`。Redis 保存带 TTL 的认证用户快照，包括 `id`、`username`、`nickname`、`roles`、`disabled`、`authVersion`、`createdAt` 和 `updatedAt`。API 处理受保护请求时优先读取 Redis 快照；快照命中且 `authVersion` 一致时直接作为当前用户上下文使用。Redis miss 时回源 PostgreSQL，校验用户状态和版本后回填快照。

`authVersion` 会在影响登录态有效性的账号变更时递增，例如用户被禁用、密码被重置或角色被调整。账号变更成功后会刷新 Redis 快照；旧 token 会因为版本不一致被拒绝。

角色使用 bitmask 表达：

```text
SUPER_ADMIN=1
ADMIN=2
JUDGE=4
```

后台入口允许 `SUPER_ADMIN` 和 `ADMIN` 登录。账号管理仅允许 `SUPER_ADMIN` 访问。裁判端入口仅允许 `JUDGE` 登录。

`board` 本轮仍不接入认证保护，只保留现有页面和 API 可达能力。

## 后续扩展点

当出现评鉴会、裁判、酒款、评分等具体工作流时，再扩展领域模型和业务表。当大盘需要实时比赛更新时，再加入实时传输通道。
