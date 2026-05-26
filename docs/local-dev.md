# Local Development

## Requirements

- Node.js 20+
- pnpm 10+
- Docker Desktop or another Docker Compose compatible runtime

## Install

```bash
pnpm install
```

## Environment

Copy `.env.example` to `.env` when you need local overrides.

```bash
cp .env.example .env
```

Important variables:

```text
API_HOST=0.0.0.0
API_PORT=4000
API_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
VITE_API_BASE_URL=http://localhost:4000
```

## Database

```bash
pnpm db:up
```

PostgreSQL is exposed at:

```text
127.0.0.1:15432
```

The initial API does not use the database yet. The container exists so persistence can be added without changing the development shape later.

## Start Everything

```bash
pnpm dev
```

Ports:

```text
api    http://localhost:4000
admin  http://localhost:5173
judge  http://localhost:5174
board  http://localhost:5175
```

## Start One App

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:judge
pnpm dev:board
```

## LAN Access

Competition-day usage is expected to happen over LAN HTTP addresses.

Example:

```text
API computer LAN IP: 192.168.1.23
VITE_API_BASE_URL=http://192.168.1.23:4000
```

When another device opens the H5 judge app, do not use `localhost` for the API. `localhost` would point to the phone itself. Use the computer's LAN IP instead.

Add LAN origins to API CORS when needed:

```text
API_ALLOWED_ORIGINS=http://192.168.1.23:5173,http://192.168.1.23:5174,http://192.168.1.23:5175
```

For quick local development, keep both localhost and LAN origins in the comma-separated list.
