import { describe, expect, it } from "vitest";
import { buildBoardCompetitionSummary } from "../../src/modules/scores/score-summary.js";
import type { StoredBeer } from "../../src/modules/beers/beers.types.js";
import type { StoredCompetition } from "../../src/modules/competitions/competitions.types.js";
import type { StoredScore } from "../../src/modules/scores/scores.types.js";

const now = new Date("2026-06-14T00:00:00.000Z");

function beer(input: Partial<StoredBeer> & Pick<StoredBeer, "id" | "entryNumber">): StoredBeer {
  return {
    id: input.id,
    competitionId: input.competitionId ?? 1,
    entryNumber: input.entryNumber,
    realName: input.realName ?? `参赛酒 ${input.entryNumber}`,
    producer: input.producer ?? "测试酒厂",
    bjcpCategoryCode: input.bjcpCategoryCode ?? "21",
    bjcpCategoryName: input.bjcpCategoryName ?? "IPA",
    bjcpSubcategoryCode: input.bjcpSubcategoryCode ?? "21A",
    bjcpSubcategoryName: input.bjcpSubcategoryName ?? "American IPA",
    description: input.description ?? "测试酒款",
    status: input.status ?? "published",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

function score(input: Partial<StoredScore> & Pick<StoredScore, "id" | "beerId">): StoredScore {
  return {
    id: input.id,
    beerId: input.beerId,
    judgeUserId: input.judgeUserId ?? input.id,
    judgeTypeSnapshot: input.judgeTypeSnapshot ?? "professional",
    judgeNicknameSnapshot: input.judgeNicknameSnapshot ?? `裁判 ${input.id}`,
    professionalAromaScore: input.professionalAromaScore ?? null,
    professionalAromaComment: input.professionalAromaComment ?? null,
    professionalAppearanceScore: input.professionalAppearanceScore ?? null,
    professionalAppearanceComment: input.professionalAppearanceComment ?? null,
    professionalFlavorScore: input.professionalFlavorScore ?? null,
    professionalFlavorComment: input.professionalFlavorComment ?? null,
    professionalMouthfeelScore: input.professionalMouthfeelScore ?? null,
    professionalMouthfeelComment: input.professionalMouthfeelComment ?? null,
    professionalOverallScore: input.professionalOverallScore ?? null,
    professionalOverallComment: input.professionalOverallComment ?? null,
    professionalTotalScore: input.professionalTotalScore ?? null,
    publicOverallPreferenceScore: input.publicOverallPreferenceScore ?? null,
    publicAromaBodyFoamScore: input.publicAromaBodyFoamScore ?? null,
    publicEntryAcceptanceScore: input.publicEntryAcceptanceScore ?? null,
    publicWillingToDrinkScore: input.publicWillingToDrinkScore ?? null,
    publicComment: input.publicComment ?? null,
    submittedAt: input.submittedAt ?? now,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

describe("score summary", () => {
  it("aggregates professional and public scores separately for every competition beer", () => {
    const competition: StoredCompetition = {
      id: 1,
      name: "夏季杯",
      description: null,
      status: "judging",
      createdAt: now,
      updatedAt: now,
    };
    const beers = [beer({ id: 2, entryNumber: 2 }), beer({ id: 1, entryNumber: 1 })];

    const summary = buildBoardCompetitionSummary({
      competition,
      beers,
      scores: [
        score({ id: 1, beerId: 1, judgeTypeSnapshot: "professional", professionalTotalScore: 40 }),
        score({ id: 2, beerId: 1, judgeTypeSnapshot: "professional", professionalTotalScore: 44 }),
        score({
          id: 3,
          beerId: 1,
          judgeTypeSnapshot: "public",
          publicOverallPreferenceScore: 8,
          publicAromaBodyFoamScore: 4,
          publicEntryAcceptanceScore: 5,
          publicWillingToDrinkScore: 4,
        }),
        score({
          id: 4,
          beerId: 1,
          judgeTypeSnapshot: "public",
          publicOverallPreferenceScore: 6,
          publicAromaBodyFoamScore: 2,
          publicEntryAcceptanceScore: 3,
          publicWillingToDrinkScore: 5,
        }),
      ],
      updatedAt: now,
    });

    expect(summary.beerCount).toBe(2);
    expect(summary.beers.map((entry) => entry.entryNumber)).toEqual([1, 2]);
    expect(summary.beers[0]).toMatchObject({
      beerId: 1,
      realName: null,
      producer: null,
      professionalJudgeCount: 2,
      professionalAverageTotalScore: 42,
      publicJudgeCount: 2,
      publicAverageOverallPreference: 7,
      publicAverageAromaBodyFoam: 3,
      publicAverageEntryAcceptance: 4,
      publicAverageWillingToDrink: 4.5,
    });
    expect(summary.beers[1]).toMatchObject({
      beerId: 2,
      professionalJudgeCount: 0,
      professionalAverageTotalScore: null,
      publicJudgeCount: 0,
      publicAverageOverallPreference: null,
    });
  });

  it("reveals beer identity only after competition is published", () => {
    const competition: StoredCompetition = {
      id: 1,
      name: "夏季杯",
      description: null,
      status: "published",
      createdAt: now,
      updatedAt: now,
    };

    const summary = buildBoardCompetitionSummary({
      competition,
      beers: [beer({ id: 1, entryNumber: 1, realName: "真实酒名", producer: "测试厂牌" })],
      scores: [],
      updatedAt: now,
    });

    expect(summary.beers[0]).toMatchObject({
      realName: "真实酒名",
      producer: "测试厂牌",
    });
  });
});
