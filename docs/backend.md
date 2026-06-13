# 后端代码组织约定

本文约束 `apps/api` 的目录、模块边界和跨模块协作方式。阅读后端代码或新增后端模块时，优先遵守本文；项目总览见 `docs/architecture.md`。

## 目标

后端按业务能力组织代码，避免单文件路由膨胀、跨模块直接访问数据库实现，以及 HTTP 语义、业务规则和数据访问逻辑互相混杂。

当前仍只维护工程底座和基础用户模块，不提前实现评鉴会、酒款、评分等业务逻辑。

## 推荐目录

```text
apps/api/src/
  app.ts
  server.ts
  config.ts
  db/
    prisma.ts
  modules/
    auth/
      auth.routes.ts
      auth.service.ts
      auth.errors.ts
      auth-user-snapshot-store.ts
      password.ts
      token.ts
    users/
      users.routes.ts
      users.service.ts
      users.repository.ts
      user-mapper.ts
      random-user.ts
  shared/
    http/
    utils/
```

`shared/` 只放无明确业务归属的技术能力。不要把业务规则放进 `shared/` 以逃避模块边界。

## 模块内分层

常规依赖方向：

```text
routes/controllers -> service -> repository
```

- `routes` 负责 HTTP 输入输出、请求 schema、响应 schema、状态码映射。
- `service` 负责业务规则、权限判断、事务边界和跨模块协作。
- `repository` 负责当前模块的数据访问实现。
- mapper 负责内部数据结构和公开 API 返回结构之间的转换。

repository 默认是模块私有实现，不作为跨模块公共 API。

## 跨模块调用

默认禁止 A 模块的 service 直接调用 B 模块的 repository。

允许的跨模块协作方式：

- 调用对方模块公开的 service/facade。
- 由调用方定义 port/interface，再由被调用方适配实现。
- 对跨多表读模型建立明确归属的查询模块或查询 repository。

示例：

```text
auth.service -> users 暴露的认证用户读取能力
auth.service 不直接 import users.repository
```

这样可以避免数据库结构、查询细节和事务实现泄漏到别的模块。

## 错误模型

模块可以定义自己的业务错误，例如 `DuplicateUsernameError`。

- repository 可以抛出数据访问相关或模块内部错误。
- service 可以抛出业务错误。
- HTTP 状态码映射放在 routes/controller 层，或模块级 HTTP error mapper。
- repository 不直接决定 HTTP 状态码。

## DTO 与 mapper

Prisma model、内部业务对象和 contracts response 不应混用。

- API 请求/响应结构优先定义在 `packages/contracts`。
- API 返回值必须经过 contracts schema 校验。
- DB model 不直接作为 response 返回。
- 模块内使用 mapper，例如 `toPublicUser`，隐藏敏感字段和内部字段。

## 事务边界

默认由 service 决定事务边界，repository 只暴露数据访问操作。

如果未来出现跨模块事务，由更高层 application service/use case 编排。不要让两个模块的 repository 私下互相调用。

## contracts 与 api-client 边界

- API 路径、请求 schema、响应 schema、公开类型优先进入 `packages/contracts`。
- `packages/api-client` 只消费 contracts，不绑定 Fastify、React、Mantine 或浏览器存储。
- 前端不手写 API 类型，优先从 contracts/api-client 获取。

## 新模块准入

新增模块前先确认：

- 是否已经有真实业务需求。
- 是否需要新增 contracts。
- 是否需要 repository，还是 service 调用现有公开能力即可。
- 是否存在跨模块调用；如果存在，优先设计 service/port，而不是共享 repository。
