import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
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

  it("documents and migrates the active score uniqueness constraint", () => {
    const migration = readFileSync(
      "prisma/migrations/0004_add_active_score_unique_index/migration.sql",
      "utf8"
    );
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    expect(migration).toContain('CREATE UNIQUE INDEX "scores_active_round_beer_judge_key"');
    expect(migration).toContain('ON "scores"("round_id", "beer_id", "judge_user_id")');
    expect(migration).toContain('WHERE "deleted_at" IS NULL');
    expect(schema).toContain("scores_active_round_beer_judge_key");
    expect(schema).toContain("raw SQL migration");
  });

  it("documents the foreign key repair migration for the existing database", () => {
    const migration = readFileSync(
      "prisma/migrations/0003_align_foreign_keys_on_update_cascade/migration.sql",
      "utf8"
    );

    expect(migration).toContain('DROP CONSTRAINT "beer_entries_competition_id_fkey"');
    expect(migration).toContain('ADD CONSTRAINT "beer_entries_competition_id_fkey"');
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).toContain("ON DELETE CASCADE");
    expect(migration.match(/ON UPDATE CASCADE/g)).toHaveLength(9);
  });
});
