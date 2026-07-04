import { describe, expect, it } from "vitest";
import {
  beerByIdPath,
  beerListPath,
  beerQrCodesPath,
  beerStatusSchema,
  bjcpSubcategories,
  competitionByIdPath,
  competitionListPath,
  competitionListQuerySchema,
  competitionListResultSchema,
  competitionStatusPath,
  competitionStatusSchema,
  judgeBeerResultSchema,
  createBeerInputSchema,
  createCompetitionInputSchema,
  judgeBeerDetailPath,
  judgeMyScorePath,
  myScoreResultSchema,
  scoreInputSchema,
  professionalScoreInputSchema,
  publicScoreInputSchema,
} from "../src/index.js";

describe("competition loop contracts", () => {
  it("defines competition paths and statuses", () => {
    expect(competitionListPath).toBe("/api/competitions");
    expect(competitionByIdPath(2)).toBe("/api/competitions/2");
    expect(competitionStatusPath(2)).toBe("/api/competitions/2/status");
    expect(competitionStatusSchema.parse("draft")).toBe("draft");
    expect(competitionStatusSchema.parse("judging")).toBe("judging");
    expect(competitionStatusSchema.parse("closed")).toBe("closed");
    expect(competitionStatusSchema.parse("published")).toBe("published");
    expect(() => competitionStatusSchema.parse("running")).toThrow();
  });

  it("defines competition list pagination query defaults and limits", () => {
    expect(competitionListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 50,
    });
    expect(competitionListQuerySchema.parse({ page: "2", limit: "25" })).toEqual({
      page: 2,
      limit: 25,
    });
    expect(() => competitionListQuerySchema.parse({ page: 0 })).toThrow();
    expect(() => competitionListQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it("parses competition list response pagination metadata", () => {
    expect(
      competitionListResultSchema.parse({
        competitions: [],
        total: 0,
        page: 1,
        limit: 50,
      })
    ).toEqual({
      competitions: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    expect(() =>
      competitionListResultSchema.parse({
        competitions: [],
        total: 0,
        page: 1,
        limit: 101,
      })
    ).toThrow();
  });

  it("defines beer paths and statuses", () => {
    expect(beerListPath(2)).toBe("/api/competitions/2/beers");
    expect(beerByIdPath(2, 5)).toBe("/api/competitions/2/beers/5");
    expect(beerQrCodesPath(2)).toBe("/api/competitions/2/qr-codes");
    expect(beerStatusSchema.parse("draft")).toBe("draft");
    expect(beerStatusSchema.parse("published")).toBe("published");
    expect(beerStatusSchema.parse("removed")).toBe("removed");
    expect(() => beerStatusSchema.parse("deleted")).toThrow();
  });

  it("defines judge paths", () => {
    expect(judgeBeerDetailPath(2, 5)).toBe("/api/judge/competitions/2/beers/5");
    expect(judgeMyScorePath(2, 5)).toBe("/api/judge/competitions/2/beers/5/my-score");
  });

  it("parses competition and beer input", () => {
    expect(createCompetitionInputSchema.parse({ name: "夏季赛", description: "MVP" })).toEqual({
      name: "夏季赛",
      description: "MVP",
    });

    const style = bjcpSubcategories[0];
    expect(
      createBeerInputSchema.parse({
        realName: "Secret IPA",
        producer: "Brewery",
        bjcpSubcategoryCode: style.subcategoryCode,
        description: "入口清爽",
      })
    ).toMatchObject({
      bjcpSubcategoryCode: style.subcategoryCode,
    });

    expect(() =>
      createBeerInputSchema.parse({
        realName: "Secret IPA",
        producer: "Brewery",
        bjcpSubcategoryCode: "99Z",
        description: "入口清爽",
      })
    ).toThrow();
  });

  it("parses professional and public score inputs", () => {
    expect(
      professionalScoreInputSchema.parse({
        professionalAromaScore: 10,
        professionalAppearanceScore: 3,
        professionalFlavorScore: 17,
        professionalMouthfeelScore: 4,
        professionalOverallScore: 8,
        professionalOverallComment: "平衡",
      })
    ).toMatchObject({
      professionalFlavorScore: 17,
    });

    expect(
      publicScoreInputSchema.parse({
        publicOverallPreferenceScore: 8,
        publicAromaBodyFoamScore: 4,
        publicEntryAcceptanceScore: 5,
        publicWillingToDrinkScore: 4,
        publicComment: "愿意再喝",
      })
    ).toMatchObject({
      publicOverallPreferenceScore: 8,
    });

    expect(() =>
      professionalScoreInputSchema.parse({
        professionalAromaScore: 13,
        professionalAppearanceScore: 3,
        professionalFlavorScore: 17,
        professionalMouthfeelScore: 4,
        professionalOverallScore: 8,
      })
    ).toThrow();

    expect(() =>
      scoreInputSchema.parse({
        professionalAromaScore: 10,
        professionalAppearanceScore: 3,
        professionalFlavorScore: 17,
        professionalMouthfeelScore: 4,
        professionalOverallScore: 8,
      })
    ).toThrow();

    expect(() =>
      scoreInputSchema.parse({
        judgeType: "public",
        publicOverallPreferenceScore: 11,
        publicAromaBodyFoamScore: 4,
        publicEntryAcceptanceScore: 5,
        publicWillingToDrinkScore: 4,
      })
    ).toThrow();
  });

  it("validates judge score outputs and strips unexpected fields", () => {
    expect(() =>
      judgeBeerResultSchema.parse({
        beer: {
          id: 1,
          competitionId: 2,
          entryNumber: 1,
          realName: "Secret IPA",
          producer: "Brewery",
          description: "入口清爽",
          status: "draft",
          competitionStatus: "running",
          canScore: true,
          bjcpCategoryCode: "21",
          bjcpCategoryName: "IPA",
          bjcpSubcategoryCode: "21A",
          bjcpSubcategoryName: "American IPA",
        },
      })
    ).toThrow();

    const parsed = myScoreResultSchema.parse({
      score: {
        id: 1,
        beerId: 2,
        judgeUserId: 3,
        judgeTypeSnapshot: "professional",
        judgeNicknameSnapshot: "Judge",
        professionalAromaScore: 10,
        professionalAromaComment: null,
        professionalAppearanceScore: 3,
        professionalAppearanceComment: null,
        professionalFlavorScore: 17,
        professionalFlavorComment: null,
        professionalMouthfeelScore: 4,
        professionalMouthfeelComment: null,
        professionalOverallScore: 8,
        professionalOverallComment: null,
        professionalTotalScore: 42,
        publicOverallPreferenceScore: null,
        publicAromaBodyFoamScore: null,
        publicEntryAcceptanceScore: null,
        publicWillingToDrinkScore: null,
        publicComment: null,
        submittedAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:00:00.000Z",
        unexpectedField: "noisy",
      },
      unexpectedTopLevel: "unexpected",
    });

    expect(parsed.score).not.toBeNull();
    if (parsed.score === null) return;

    expect(parsed).toEqual({
      score: expect.objectContaining({
        id: 1,
        beerId: 2,
        judgeTypeSnapshot: "professional",
      }),
    });
    expect("unexpectedField" in parsed.score).toBe(false);
    expect("unexpectedTopLevel" in parsed).toBe(false);
  });
});
