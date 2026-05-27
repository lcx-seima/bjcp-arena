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

API 负责运行时行为。`packages/contracts` 负责公开的请求和响应结构。`packages/api-client` 消费这些契约，并暴露类似 `client.ping()` 的小型方法。

前端应用始终通过真实 HTTP 基础地址调用 API：

```text
admin/judge/board -> @bjcp-arena/api-client -> http://<api-host>:4000/api/ping
```

项目刻意不使用 Vite 开发代理。本地开发应暴露与正式评鉴现场相同的 CORS 和局域网地址问题。

## 当前范围

初始范围只包含工程骨架：

- `GET /api/ping`
- `admin`、`judge` 和 `board` 的 hello-world 页面
- 面向未来持久化工作的 Docker 化 PostgreSQL
- 本地开发和测试预期文档

以下内容有意延后：

- 评鉴会领域模型
- 账号和认证流程
- 数据库 schema 与迁移
- 实时大盘传输通道
- 生产部署打包
- 组件库或设计系统

## 后续扩展点

当出现需要状态的具体工作流时再加入持久化。当大盘需要实时比赛更新时再加入实时传输通道。当账号边界和比赛角色可以明确建模时再加入认证。
