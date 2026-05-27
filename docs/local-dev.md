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

需要本地覆盖配置时，将 `.env.example` 复制为 `.env`。

```bash
cp .env.example .env
```

重要变量：

```text
API_HOST=0.0.0.0
API_PORT=4000
API_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
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

初始 API 还不会使用 PostgreSQL 或 Redis。保留容器是为了后续加入持久化、缓存或临时状态能力时不改变开发形态。

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
