# 注记：大屏端已暂停并从当前代码中移除；以下为历史设计记录，保留原始上下文。

# 基础用户模块设计

## 目标

实现 `bjcp-arena` 的基础用户模块，覆盖用户登录、角色 bitmask、超级管理员初始化、后台账号管理、裁判端登录后用户信息展示。

本阶段仍保持项目当前定位：只补齐工程底座需要的认证和账号管理能力，不实现评鉴会、裁判任务、酒款、评分、实时大盘等业务逻辑。

## 范围

本次包含：

- PostgreSQL 用户表和 Prisma 迁移。
- JWT 登录与鉴权。
- Redis 缓存认证用户快照，用于减少受保护请求的 DB 查询，并配合 `authVersion` 批量失效旧 token。
- 共享 contract 中定义 auth 和 user API。
- 框架无关 `api-client` 支持认证请求。
- 后台管理端登录、初始化超管、基础布局、账号管理。
- 裁判端登录和登录用户信息展示。

本次不包含：

- 用户自主注册。
- 单独的 role 表或 permission 表。
- 独立踢 token 接口。
- Cookie session。
- `apps/board` 登录保护。
- 业务域模型、认证体系之外的权限系统、实时通道或组件库体系建设。
- React 组件测试、E2E、截图测试、视觉回归或 Storybook。

## 技术方案

采用 Prisma + PostgreSQL + JWT + Redis 认证用户快照。

Prisma 负责用户表 schema、迁移和类型安全查询。JWT 负责跨局域网 IP 和跨 origin 的登录态传递，前端将 token 存入 `localStorage`，请求时通过 `Authorization: Bearer <token>` 调用 API。Redis 不保存 session，也不保存 token 黑名单，只缓存带 TTL 的认证用户快照，让后端在快照命中时无需回源 DB 就能拿到当前用户上下文。

## 用户模型

新增 `users` 表，字段如下：

- `id`：自增主键。
- `username`：唯一登录名。
- `nickname`：展示名。
- `passwordHash`：密码哈希。
- `roles`：角色 bitmask 整数。
- `disabled`：是否停用，默认 `false`。
- `authVersion`：认证版本号，默认 `0`。
- `createdAt`：创建时间。
- `updatedAt`：更新时间。

不保留原需求中的 `user_id`。登录和账号管理统一使用 `username`。

普通用户创建时，如果超管未手动填写用户名或昵称：

- `username` 默认生成 6 位英文数字混合随机串。
- `nickname` 默认生成 `bjcp_{random_6_mix_char_num}`。

`username` 只允许英文和数字。后台创建用户和编辑用户名时，后端必须做同样校验。

超级管理员初始化固定创建：

- `username = "superadmin"`
- `nickname = "superadmin"`
- `roles = SUPER_ADMIN`

初始化页面只需要填写密码。

## 角色模型

角色使用 bitmask，不新增 role 表或 permission 表。

建议常量：

- `SUPER_ADMIN = 1`
- `ADMIN = 2`
- `JUDGE = 4`

一个账号可以拥有多个角色，例如 `ADMIN | JUDGE`。

入口和功能规则：

- 超管：可以进入后台；后台可见可用所有功能，包括账号管理。
- 管理员：可以进入后台；后台不可见也不可使用账号管理。
- 裁判员：可以进入裁判端；进入后台后前端展示无权限提示。

如果一个用户需要同时管理后台和担任裁判，应显式授予多个角色，例如 `ADMIN | JUDGE`。不通过角色继承或隐式权限让 `ADMIN` 自动具备裁判身份，也不让 `SUPER_ADMIN` 自动具备裁判身份。

后端仍对受保护 API 做最终权限校验，不能只依赖前端页面拦截。

## JWT 与 authVersion

登录成功后签发 7 天有效期 JWT。

JWT payload 至少包含：

- `sub`：用户主键 id。
- `authVersion`

鉴权流程：

1. 读取 `Authorization: Bearer <token>`。
2. 校验 JWT 签名和有效期。
3. 用 `sub` 查询 Redis 中该用户的认证用户快照。
4. Redis 命中时，若快照中的用户已停用，或快照 `authVersion` 与 JWT 中 `authVersion` 不一致，则拒绝请求；否则直接使用快照作为当前用户上下文。
5. Redis miss 时回源 DB，读取用户状态和 `authVersion`，校验通过后写入 Redis 快照。
6. 若接口要求特定角色，继续按 bitmask 校验角色。

触发旧 token 失效的动作：

- 修改 `username`。
- 修改角色。
- 重置密码。
- 停用或启用用户。

这些动作执行时，DB 中 `authVersion += 1`，并同步 Redis 中该用户的最新认证用户快照。

普通退出登录只删除前端本地 token，不自增 `authVersion`，避免把同账号其他设备也踢掉。

## API 契约

所有路径、请求 schema、响应 schema 和类型先定义在 `packages/contracts`，API 和 `packages/api-client` 共同消费。

公开接口：

- `GET /api/auth/bootstrap-status`
  - 返回系统是否已有用户。
  - 后台用于决定展示登录页还是初始化超管页。
- `POST /api/auth/bootstrap-super-admin`
  - 仅当用户表为空时可调用。
  - 请求体只包含 `password`。
  - 创建固定 `superadmin` 账号并返回 token 和当前用户。
- `POST /api/auth/login`
  - 请求体包含 `username` 和 `password`。
  - 不传 `client` 或 `system`。
  - 登录只负责校验账号密码、停用状态并返回 token 和当前用户。

登录后接口：

- `GET /api/auth/me`
  - 返回当前登录用户。
- `POST /api/auth/logout`
  - 返回成功。
  - 后端不修改 `authVersion`。

超管账号管理接口：

- `GET /api/users`
  - 仅超管可用。
  - 返回用户列表。
- `POST /api/users`
  - 仅超管可用。
  - 创建账号，支持填写或自动生成 `username`、`nickname`，必须提供密码和角色。
- `PATCH /api/users/:id`
  - 仅超管可用。
  - 可修改 `username`、`nickname`、`roles`、`disabled`。
  - 修改 `username`、`roles`、`disabled` 时递增 `authVersion`。
- `POST /api/users/:id/reset-password`
  - 仅超管可用。
  - 请求体包含新密码。
  - 成功后递增 `authVersion`。

暂不新增独立 `revoke-tokens` 接口。

## API Client

`packages/api-client` 保持框架无关。

新增能力：

- auth 相关方法：查询 bootstrap 状态、初始化超管、登录、读取当前用户、退出登录。
- user 管理方法：列表、创建、更新、重置密码。
- 支持 token provider 或显式 token 配置。
- 对需要认证的请求自动追加 `Authorization: Bearer <token>`。
- 继续使用 contracts 中的 Zod schema 解析响应。

前端负责：

- 登录成功后写入 `localStorage`。
- 启动时从 `localStorage` 读取 token 并调用 `me`。
- 退出时调用 `logout` 后删除本地 token。

## 管理后台

`apps/admin` 可以引入 `react-router-dom` 做路由。

推荐暂不引入完整组件库，先使用本地 CSS 和小型自定义表单、按钮、表格组件，避免早期被组件库 API 绑定。页面结构保持清晰，后续可以替换为组件库。

未登录流程：

1. 进入后台时调用 `bootstrap-status`。
2. 如果系统无用户，跳转到 `/bootstrap`。
3. `/bootstrap` 页面只填写密码，提交后创建固定 `superadmin` 并登录。
4. 如果系统已有用户，展示 `/login`。
5. 登录成功后 token 写入 `localStorage` 并进入后台布局。

登录后布局：

- 左侧导航。
- 右侧路由 page root。
- 导航至少包含“概览”和“账号管理”。
- “账号管理”仅超管可见。

页面：

- `/` 或 `/dashboard`
  - 展示当前登录用户、角色、API 状态。
- `/users`
  - 仅超管可访问。
  - 支持用户列表、创建用户、编辑用户、重置密码、停用/启用。
  - 创建用户和重置密码表单提供“随机”按钮，将随机密码回填到输入框。
- 无权限页
  - 管理员或裁判员直接访问不可用页面时展示。

后台入口权限：

- 超管可以使用全部后台页面。
- 管理员可以进入后台，但不可访问账号管理。
- 裁判员登录后台后展示角色不匹配提示，并允许退出。
- 只有同时具备 `ADMIN` 或 `SUPER_ADMIN` 的用户可以进入后台；仅具备 `JUDGE` 的用户不能进入后台。

## 裁判端

`apps/judge` 新增登录页。

登录成功后：

- token 写入 `localStorage`。
- 调用 `me` 获取当前用户。
- 如果账号角色不允许使用裁判端，展示“当前账号不可用于裁判端”的提示，并提供退出。
- 如果角色匹配，展示登录用户信息。

裁判端本阶段不实现评分、任务、酒款或评鉴会业务。

裁判端入口权限：

- 只有具备 `JUDGE` 的用户可以进入裁判端。
- 仅具备 `SUPER_ADMIN` 或 `ADMIN` 的用户不能进入裁判端。
- 需要同时进入后台和裁判端的账号必须显式配置组合角色，例如 `ADMIN | JUDGE` 或 `SUPER_ADMIN | JUDGE`。

## 后端实现边界

建议 API 内部分层保持轻量：

- `src/db`：Prisma client 和数据库连接。
- `src/auth`：密码哈希、JWT 签发校验、角色判断、认证用户快照读取和写入。
- `src/users`：用户查询、创建、更新、重置密码。
- `src/routes`：auth 和 users 路由注册。

不要提前引入复杂权限 DSL、领域事件、审计日志、认证中间件框架或业务聚合。

## 配置

新增必要环境变量：

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AUTH_USER_CACHE_TTL_SECONDS`

默认本地值应与 `compose.yaml` 暴露端口匹配。

`JWT_EXPIRES_IN` 默认 `7d`。`AUTH_USER_CACHE_TTL_SECONDS` 默认 `1800`。

## 测试策略

自动化测试聚焦 API、contracts、api-client，符合现有 `docs/testing.md`。

contracts 测试覆盖：

- auth/user 路径常量。
- 请求和响应 schema。
- 角色 bitmask 工具或常量。

api-client 测试覆盖：

- 公开接口不带 token。
- 认证接口带 Bearer token。
- 登录响应解析。
- 用户管理响应解析。
- 非 OK 响应报错。

API 测试使用 Vitest + Fastify `app.inject`，覆盖：

- bootstrap 状态。
- 用户为空时创建超管。
- 用户非空时禁止重复 bootstrap。
- 登录成功和失败。
- 停用用户不能登录。
- `me` 需要有效 token。
- Redis 认证用户快照命中、miss 回源和 `authVersion` 不匹配时拒绝。
- 非超管不能访问用户管理。
- 超管创建用户、修改用户、重置密码。

前端不加 React 组件测试或 E2E。实现完成前运行：

```bash
pnpm verify
```

并进行人工 smoke：

- 后台初始化超管。
- 后台登录。
- 超管创建管理员和裁判员。
- 管理员登录后台后看不到账号管理。
- 裁判员登录后台后看到无权限提示。
- 裁判员登录裁判端后看到用户信息。

## 迁移与兼容

当前项目没有已有用户数据，不需要数据迁移兼容策略。Prisma 初始 migration 直接创建 `users` 表即可。

## 风险与约束

- `localStorage` 存 token 会暴露给同源脚本，因此前端应避免引入不可信脚本。本阶段局域网内使用，接受该权衡。
- `JWT_SECRET` 必须在部署环境显式设置，不能使用弱默认值。
- Redis 中的认证用户快照是缓存，不是事实来源；DB 始终是权威数据。
- 若 Redis 不可用，应明确选择失败关闭或降级回源 DB，避免绕过吊销检查。
- 本阶段账号管理只解决基础登录和用户维护，不扩展到审计、登录记录或细粒度权限。
