# BJCP Arena Architecture

## Overview

This repository starts as a small pnpm monorepo for a beer judging arena system. The initial goal is a working foundation: one API, three web entry points, shared contracts, and a shared API client.

## Workspace Layout

```text
apps/
  api/      Fastify HTTP API
  admin/    PC admin web app
  judge/    mobile H5 judge web app
  board/    live display board web app

packages/
  contracts/   shared API paths, schemas, and TypeScript types
  api-client/  framework-agnostic HTTP client
  configs/     shared TypeScript, ESLint, and Prettier config
  utils/       small shared utilities when they are genuinely needed
```

## Data Flow

The API owns runtime behavior. `packages/contracts` owns public request and response shapes. `packages/api-client` consumes those contracts and exposes small methods such as `client.ping()`.

The frontend apps call the API through a real HTTP base URL:

```text
admin/judge/board -> @bjcp-arena/api-client -> http://<api-host>:4000/api/ping
```

There is intentionally no Vite dev proxy. Local development should surface the same CORS and LAN-address issues that will matter during a competition.

## Current Scope

The initial scope is only the skeleton:

- `GET /api/ping`
- hello-world pages for `admin`, `judge`, and `board`
- Dockerized PostgreSQL for future persistence work
- docs for local development and testing expectations

The following are intentionally deferred:

- judging session domain models
- account and auth flows
- database schema and migrations
- realtime board transport
- production deployment packaging
- component library or design system

## Future Expansion Points

Add persistence when there is a concrete workflow that needs state. Add realtime transport when the board needs live competition updates. Add auth when account boundaries and competition roles are ready to model.
