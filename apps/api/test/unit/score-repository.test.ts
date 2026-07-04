import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPrismaScoreRepository } from "../../src/modules/scores/scores.repository.js";

const submittedAt = new Date("2026-06-14T00:00:00.000Z");
const createdAt = new Date("2026-06-14T00:00:01.000Z");
const updatedAt = new Date("2026-06-14T00:00:02.000Z");

function prismaScore(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    beerId: 2,
    judgeUserId: 3,
    judgeTypeSnapshot: "professional",
    judgeNicknameSnapshot: "专业裁判",
    professionalAromaScore: 10,
    professionalAromaComment: "香气干净",
    professionalAppearanceScore: 3,
    professionalAppearanceComment: null,
    professionalFlavorScore: 18,
    professionalFlavorComment: null,
    professionalMouthfeelScore: 4,
    professionalMouthfeelComment: null,
    professionalOverallScore: 8,
    professionalOverallComment: "整体不错",
    professionalTotalScore: 43,
    publicOverallPreferenceScore: null,
    publicAromaBodyFoamScore: null,
    publicEntryAcceptanceScore: null,
    publicWillingToDrinkScore: null,
    publicComment: null,
    submittedAt,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

describe("prisma score repository", () => {
  it("uses the beer and judge compound key when finding and upserting scores", async () => {
    const findUnique = vi.fn(async () => prismaScore());
    const upsert = vi.fn(async () => prismaScore({ id: 9, professionalTotalScore: 41 }));
    const repository = createPrismaScoreRepository({
      score: {
        findUnique,
        upsert,
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient);

    const found = await repository.findScore(2, 3);
    expect(found).toMatchObject({
      beerId: 2,
      judgeUserId: 3,
      judgeTypeSnapshot: "professional",
      professionalTotalScore: 43,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        beerId_judgeUserId: {
          beerId: 2,
          judgeUserId: 3,
        },
      },
    });

    const input = {
      beerId: 2,
      judgeUserId: 3,
      judgeTypeSnapshot: "professional" as const,
      judgeNicknameSnapshot: "专业裁判",
      professionalAromaScore: 9,
      professionalAromaComment: null,
      professionalAppearanceScore: 3,
      professionalAppearanceComment: null,
      professionalFlavorScore: 17,
      professionalFlavorComment: null,
      professionalMouthfeelScore: 4,
      professionalMouthfeelComment: null,
      professionalOverallScore: 8,
      professionalOverallComment: null,
      professionalTotalScore: 41,
      publicOverallPreferenceScore: null,
      publicAromaBodyFoamScore: null,
      publicEntryAcceptanceScore: null,
      publicWillingToDrinkScore: null,
      publicComment: null,
      submittedAt,
    };

    const upserted = await repository.upsertScore(input);
    expect(upserted).toMatchObject({
      id: 9,
      professionalTotalScore: 41,
    });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        beerId_judgeUserId: {
          beerId: 2,
          judgeUserId: 3,
        },
      },
      create: input,
      update: input,
    });
  });

});
