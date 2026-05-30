import { describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "../../src/db/prisma.js";

vi.mock("@prisma/client", () => {
  class PrismaClient {
    constructor(public readonly options: unknown) {}
  }

  return {
    PrismaClient,
  };
});

describe("prisma client", () => {
  it("uses the configured database URL for the datasource", () => {
    const client = createPrismaClient("postgresql://example.local/bjcp_arena") as unknown as {
      options: unknown;
    };

    expect(client.options).toEqual({
      datasources: {
        db: {
          url: "postgresql://example.local/bjcp_arena",
        },
      },
    });
  });
});
