# 测试策略

## 原则

测试应保护高价值边界，同时避免让快速变化的 UI 变得难以调整。本仓库当前从 API、contracts 和 api-client 测试开始。UI 验收采用人工冒烟检查。

## 自动化测试

### API

使用 Vitest 搭配 Fastify `app.inject`。

覆盖：

- 路由状态码
- 响应体
- 契约 schema 兼容性
- 允许和不允许来源时的 CORS 头
- 超管初始化 bootstrap
- 登录、当前用户 `me`
- 用户管理权限边界
- Redis 认证用户快照命中时无需回源 DB
- Redis miss 时回源 DB 并回填快照
- Redis 快照 `authVersion` 变化后的旧 token 失效

当前命令：

```bash
pnpm test:api
```

### 契约

使用 Vitest 测试共享 Zod schema 和导出常量。

覆盖：

- 端点路径
- 可接受的响应结构
- 被拒绝的契约漂移

当前命令：

```bash
pnpm test:contracts
```

### API 客户端

使用 Vitest 搭配假的 `fetch`。

覆盖：

- 基础 URL 和路径拼接
- 请求方法和请求头
- 公开 auth 请求不携带 token
- 认证请求携带 Bearer token
- 用户管理方法
- 成功响应解析
- HTTP status 错误
- schema 校验失败

当前命令：

```bash
pnpm test:api-client
```

### 工具包

只有当 `packages/utils` 包含真实逻辑时才添加测试。不要为了覆盖率编写占位测试。

## 当前不添加的测试

除非项目方向发生变化并且预期投入产出比变得明确，否则不要添加以下测试：

- Playwright E2E 测试
- React 组件测试
- 截图测试
- 视觉回归测试
- Storybook 测试设置

原因：

- 早期 UI 会快速变化
- 组件测试容易锁定实现细节
- 浏览器自动化会增加搭建和维护成本
- 当前 UI 验收以人工冒烟覆盖关键入口和权限边界

## 人工 UI 冒烟检查

运行：

```bash
pnpm dev
```

打开：

```text
http://localhost:5173
http://localhost:5174
http://localhost:5175
```

检查：

- 后台首次打开时，如果用户表为空，可以初始化 `superadmin`。
- 超管可以创建管理员账号和裁判员账号。
- 管理员可以进入后台，但不能访问账号管理。
- 只有裁判员可以进入裁判端。
- board 本轮仍只检查 API 可达和现有页面可打开即可。
- judge 端按 iPhone 17 竖屏标准视口检查：`402 x 874 CSS px`，不应出现横向滚动、文字遮挡或主要操作不可见。

因为应用使用真实 HTTP CORS，而不是 Vite 代理，所以这项人工检查也会验证局域网访问模型在本地的表现。

## 验证命令

认为实现完成前，运行：

```bash
pnpm verify
```

该命令会执行 lint、typecheck、单元测试和构建。
