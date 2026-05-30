# 本地开发

## 环境要求

- Node.js 20+
- pnpm 10+
- Docker Desktop 或其他兼容 Docker Compose 的运行时

## 安装

```bash
pnpm install
```

## 环境变量

本地默认配置已经能连接 `compose.yaml` 中的 PostgreSQL 和 Redis。需要覆盖配置时，可以在启动命令前设置 shell 环境变量，或按应用目录放置 `.env`：

```bash
cp .env.example apps/api/.env
cp .env.example apps/admin/.env
cp .env.example apps/judge/.env
```

API 读取 `apps/api/.env`。Vite 前端读取各自应用目录下的 `.env`，例如 `apps/admin/.env` 和 `apps/judge/.env`。根目录 `.env` 不作为稳定的应用配置入口。

重要变量：

```text
API_HOST=0.0.0.0
API_PORT=4000
API_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
DATABASE_URL=postgresql://bjcp_arena:bjcp_arena@127.0.0.1:25432/bjcp_arena
REDIS_URL=redis://127.0.0.1:26379
JWT_SECRET=local-development-secret-change-me
JWT_EXPIRES_IN=7d
VITE_API_BASE_URL=http://localhost:4000
```

## 本地基础设施

```bash
pnpm infra:up
```

PostgreSQL 暴露在：

```text
127.0.0.1:25432
```

Redis 暴露在：

```text
127.0.0.1:26379
```

API 会使用 PostgreSQL 保存用户数据，并使用 Redis 记录认证版本状态。启动 API 前应先确保本地基础设施已启动。

## 数据库迁移

首次启动或 Prisma schema 变更后，执行：

```bash
pnpm --filter @bjcp-arena/api db:generate
pnpm --filter @bjcp-arena/api db:migrate
```

## 后台初始化

首次打开后台管理端时，如果用户表为空，页面会进入超管初始化流程。

初始化账号固定为：

```text
username=superadmin
nickname=superadmin
```

完成初始化后，使用该账号登录后台，再创建管理员或裁判员账号。

## 启动全部应用

```bash
pnpm dev
```

端口：

```text
api    http://localhost:4000
admin  http://localhost:5173
judge  http://localhost:5174
board  http://localhost:5175
```

## 启动单个应用

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:judge
pnpm dev:board
```

## 局域网访问

评鉴现场预计通过局域网 HTTP 地址访问。

示例：

```text
API 电脑局域网 IP: 192.168.1.23
VITE_API_BASE_URL=http://192.168.1.23:4000
```

当其他设备打开 H5 裁判端时，API 地址不要使用 `localhost`。`localhost` 会指向手机自身，应改用电脑的局域网 IP。

需要时，将局域网 origin 添加到 API CORS：

```text
API_ALLOWED_ORIGINS=http://192.168.1.23:5173,http://192.168.1.23:5174,http://192.168.1.23:5175
```

为了方便本地开发，可以在逗号分隔列表中同时保留 localhost 和局域网 origin。
