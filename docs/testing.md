# Testing Strategy

## Principle

Testing should protect high-value boundaries without making fast-moving UI expensive to change. This repository starts with API, contract, and API-client tests. UI validation is handled by manual smoke checks.

## Automated Tests

### API

Use Vitest with Fastify `app.inject`.

Cover:

- route status codes
- response bodies
- contract schema compatibility
- CORS headers for allowed and disallowed origins

Current command:

```bash
pnpm test:api
```

### Contracts

Use Vitest for shared Zod schemas and exported constants.

Cover:

- endpoint paths
- accepted response shapes
- rejected contract drift

Current command:

```bash
pnpm test:contracts
```

### API Client

Use Vitest with a fake `fetch`.

Cover:

- base URL and path joining
- request method and headers
- successful response parsing
- non-OK HTTP responses
- schema validation failures

Current command:

```bash
pnpm test:api-client
```

### Utils

Only add tests when `packages/utils` contains real logic. Do not write placeholder tests for coverage.

## Tests We Are Not Adding Now

Do not add these unless the project direction changes and the expected ROI becomes clear:

- Playwright E2E tests
- React component tests
- screenshot tests
- visual regression tests
- Storybook test setup

Reasons:

- the early UI will change quickly
- component tests can lock in implementation details
- browser automation adds setup and maintenance cost
- the current acceptance target is API reachability and visible `pong`, not complex UI behavior

## Manual UI Smoke

Run:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173
http://localhost:5174
http://localhost:5175
```

Each page should show:

- its own app title
- the configured API base URL
- `pong from bjcp-arena-api`

Because the apps use real HTTP CORS instead of Vite proxy, this manual check also validates the local version of the LAN access model.

## Verification Command

Before considering implementation complete, run:

```bash
pnpm verify
```

This executes lint, typecheck, unit tests, and builds.
