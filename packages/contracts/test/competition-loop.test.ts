import { describe, expect, it } from "vitest";
import {
  amateurScoreInputSchema,
  beerListPath,
  beerImportPath,
  beerResultSchema,
  competitionByIdPath,
  competitionListPath,
  competitionListQuerySchema,
  competitionListResultSchema,
  competitionStatusPath,
  entityStatusSchema,
  judgeCompetitionListPath,
  judgeRoundBeerLookupPath,
  judgeRoundBeerDetailPath,
  judgeRoundBeerScorePath,
  judgeRoundDetailPath,
  judgeRoundListPath,
  normalizeEntryCode,
  professionalScoreGrade,
  professionalScoreInputSchema,
  roundBeerPath,
  roundByIdPath,
  roundListPath,
  roundStatusPath,
  scoreInputSchema,
} from "../src/index.js";

describe("competition loop contracts", () => {
  it("defines competition paths, pagination and two-state lifecycle", () => {
    expect(competitionListPath).toBe("/api/competitions");
    expect(competitionByIdPath(2)).toBe("/api/competitions/2");
    expect(competitionStatusPath(2)).toBe("/api/competitions/2/status");
    expect(entityStatusSchema.parse("ongoing")).toBe("ongoing");
    expect(entityStatusSchema.parse("ended")).toBe("ended");
    expect(() => entityStatusSchema.parse("draft")).toThrow();
    expect(competitionListQuerySchema.parse({})).toEqual({ page: 1, limit: 50 });
    expect(competitionListQuerySchema.parse({ page: "2", limit: "25" })).toEqual({
      page: 2,
      limit: 25,
    });
    expect(
      competitionListResultSchema.parse({
        competitions: [],
        total: 0,
        page: 1,
        limit: 50,
      })
    ).toEqual({ competitions: [], total: 0, page: 1, limit: 50 });
  });

  it("normalizes and validates entry codes", () => {
    expect(normalizeEntryCode(" sa1234 ")).toBe("SA1234");
    expect(normalizeEntryCode("SA1234")).toBe("SA1234");
    expect(() => normalizeEntryCode("S12345")).toThrow();
    expect(() => normalizeEntryCode("SA123")).toThrow();
    expect(() => normalizeEntryCode("SAA123")).toThrow();
  });

  it("defines beer and round admin paths", () => {
    expect(beerListPath(2)).toBe("/api/competitions/2/beers");
    expect(beerImportPath(2)).toBe("/api/competitions/2/beers/import");
    expect(roundListPath(2)).toBe("/api/competitions/2/rounds");
    expect(roundByIdPath(2, 5)).toBe("/api/competitions/2/rounds/5");
    expect(roundStatusPath(2, 5)).toBe("/api/competitions/2/rounds/5/status");
    expect(roundBeerPath(2, 5)).toBe("/api/competitions/2/rounds/5/beers");
  });

  it("defines judge paths", () => {
    expect(judgeCompetitionListPath).toBe("/api/judge/competitions");
    expect(judgeRoundListPath(2)).toBe("/api/judge/competitions/2/rounds");
    expect(judgeRoundDetailPath(2, 5)).toBe("/api/judge/competitions/2/rounds/5");
    expect(judgeRoundBeerLookupPath(2, 5)).toBe("/api/judge/competitions/2/rounds/5/beer-lookup");
    expect(judgeRoundBeerDetailPath(2, 5, 8)).toBe("/api/judge/competitions/2/rounds/5/beers/8");
    expect(judgeRoundBeerScorePath(2, 5, 8)).toBe(
      "/api/judge/competitions/2/rounds/5/beers/8/my-score"
    );
  });

  it("parses beer result without status and with immutable identifiers", () => {
    const parsed = beerResultSchema.parse({
      beer: {
        id: 1,
        competitionId: 2,
        entryCode: "SA1234",
        entryNumber: 1,
        bjcpCategoryCode: "21",
        bjcpCategoryName: "IPA",
        bjcpSubcategoryCode: "21B",
        bjcpSubcategoryName: "Specialty IPA",
        description: "参赛介绍",
        name: "参赛酒名",
        brewery: "参赛酒厂",
        createdAt: "2026-07-05T00:00:00.000Z",
        updatedAt: "2026-07-05T00:00:00.000Z",
      },
    });

    expect(parsed.beer).toMatchObject({
      entryCode: "SA1234",
      entryNumber: 1,
      name: "参赛酒名",
      brewery: "参赛酒厂",
    });
  });

  it("validates professional scores, computes grades and requires dimension feedback", () => {
    expect(professionalScoreGrade(50)).toBe("Outstanding");
    expect(professionalScoreGrade(44)).toBe("Excellent");
    expect(professionalScoreGrade(37)).toBe("Very Good");
    expect(professionalScoreGrade(29)).toBe("Good");
    expect(professionalScoreGrade(20)).toBe("Fair");
    expect(professionalScoreGrade(13)).toBe("Problematic");

    expect(
      professionalScoreInputSchema.parse({
        professionalAromaScore: 10,
        professionalAromaComment: "香气干净，酒花明显",
        professionalAppearanceScore: 3,
        professionalAppearanceComment: "泡沫细腻",
        professionalFlavorScore: 18,
        professionalFlavorComment: "入口平衡，收口干净",
        professionalMouthfeelScore: 4,
        professionalMouthfeelComment: "酒体中等，杀口适中",
        professionalOverallScore: 8,
        professionalOverallComment: "整体完成度高",
      })
    ).toMatchObject({ professionalFlavorScore: 18 });

    expect(() =>
      professionalScoreInputSchema.parse({
        professionalAromaScore: 10,
        professionalAromaComment: "",
        professionalAppearanceScore: 3,
        professionalAppearanceComment: "泡沫细腻",
        professionalFlavorScore: 18,
        professionalFlavorComment: "入口平衡，收口干净",
        professionalMouthfeelScore: 4,
        professionalMouthfeelComment: "酒体中等，杀口适中",
        professionalOverallScore: 8,
        professionalOverallComment: "整体完成度高",
      })
    ).toThrow();
  });

  it("validates amateur scores and unified score input", () => {
    expect(
      amateurScoreInputSchema.parse({
        amateurDrinkabilityScore: 4,
        amateurBalanceScore: 5,
        amateurFlavorAcceptanceScore: 4,
        amateurRepeatIntentionScore: 5,
        amateurComment: "轻松顺口，愿意复饮",
      })
    ).toMatchObject({ amateurBalanceScore: 5 });

    expect(() =>
      amateurScoreInputSchema.parse({
        amateurDrinkabilityScore: 4,
        amateurBalanceScore: 5,
        amateurFlavorAcceptanceScore: 4,
        amateurRepeatIntentionScore: 5,
        amateurComment: "",
      })
    ).toThrow();

    expect(
      scoreInputSchema.parse({
        judgeType: "public",
        amateurDrinkabilityScore: 4,
        amateurBalanceScore: 5,
        amateurFlavorAcceptanceScore: 4,
        amateurRepeatIntentionScore: 5,
        amateurComment: "轻松顺口，愿意复饮",
      })
    ).toMatchObject({ judgeType: "public" });
  });
});
