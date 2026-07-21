import { describe, expect, it } from "vitest";
import {
  amateurScoreInputSchema,
  beerListPath,
  beerImportPath,
  beerResultSchema,
  competitionByIdPath,
  competitionStatusSchema,
  competitionListPath,
  competitionListQuerySchema,
  competitionListResultSchema,
  competitionStatusPath,
  createBeerInputSchema,
  deleteMyScoreResultSchema,
  entityStatusSchema,
  importBeersInputSchema,
  judgeBeerResultSchema,
  judgeCompetitionListPath,
  judgeRoundBeerLookupPath,
  judgeRoundBeerDetailPath,
  judgeRoundBeerScorePath,
  judgeRoundDetailResultSchema,
  judgeRoundDetailPath,
  judgeRoundListPath,
  judgeTypeConsumer,
  normalizeEntryCode,
  professionalScoreGrade,
  professionalScoreInputSchema,
  roundBeerPath,
  roundByIdPath,
  roundListPath,
  roundStatusPath,
  scoreInputSchema,
  updateBeerInputSchema,
  updateCompetitionStatusInputSchema,
} from "../src/index.js";

describe("competition loop contracts", () => {
  it("defines competition three-state lifecycle, round two-state lifecycle and archive scope", () => {
    expect(competitionListPath).toBe("/api/competitions");
    expect(competitionByIdPath(2)).toBe("/api/competitions/2");
    expect(competitionStatusPath(2)).toBe("/api/competitions/2/status");
    expect(entityStatusSchema.parse("ongoing")).toBe("ongoing");
    expect(entityStatusSchema.parse("ended")).toBe("ended");
    expect(() => entityStatusSchema.parse("archived")).toThrow();
    expect(() => entityStatusSchema.parse("draft")).toThrow();
    expect(competitionStatusSchema.parse("archived")).toBe("archived");
    expect(updateCompetitionStatusInputSchema.parse({ status: "archived", confirm: true })).toEqual(
      {
        status: "archived",
        confirm: true,
      }
    );
    expect(competitionListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 50,
      archiveScope: "unarchived",
    });
    expect(
      competitionListQuerySchema.parse({ page: "2", limit: "25", archiveScope: "archived" })
    ).toEqual({
      page: 2,
      limit: 25,
      archiveScope: "archived",
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

  it("requires the persisted total score in judge submitted beer results", () => {
    const submittedBeer = {
      id: 8,
      competitionId: 2,
      roundId: 5,
      entryCode: "SA1234",
      entryNumber: 1,
      totalScore: 18,
      bjcpCategoryCode: "21",
      bjcpCategoryName: "IPA",
      bjcpSubcategoryCode: "21A",
      bjcpSubcategoryName: "American IPA",
      description: "参赛介绍",
      submittedAt: "2026-07-21T10:00:00.000Z",
    };
    const result = {
      round: {
        id: 5,
        competitionId: 2,
        name: "第一轮",
        status: "ongoing",
        submittedBeerCount: 1,
        createdAt: "2026-07-21T09:00:00.000Z",
        updatedAt: "2026-07-21T09:00:00.000Z",
      },
      beers: [submittedBeer],
    };

    expect(judgeRoundDetailResultSchema.parse(result).beers[0]?.totalScore).toBe(18);
    expect(() =>
      judgeRoundDetailResultSchema.parse({
        ...result,
        beers: [{ ...submittedBeer, totalScore: undefined }],
      })
    ).toThrow();
  });

  it("validates judge score deletion result", () => {
    expect(deleteMyScoreResultSchema.parse({ ok: true })).toEqual({ ok: true });
    expect(() => deleteMyScoreResultSchema.parse({ ok: false })).toThrow();
  });

  it("defaults optional beer category remarks to an empty string", () => {
    expect(
      createBeerInputSchema.parse({
        entryCode: " sa1234 ",
        bjcpSubcategoryCode: "21A",
        description: "参赛介绍",
        name: "参赛酒名",
        brewery: "参赛酒厂",
      })
    ).toMatchObject({ categoryRemark: "" });

    expect(
      createBeerInputSchema.parse({
        entryCode: "sa1234",
        bjcpSubcategoryCode: "21A",
        categoryRemark: "  美式 IPA 特殊组  ",
        description: "参赛介绍",
        name: "参赛酒名",
        brewery: "参赛酒厂",
      })
    ).toMatchObject({ categoryRemark: "美式 IPA 特殊组" });

    expect(
      importBeersInputSchema.parse({
        beers: [
          {
            rowNumber: 2,
            entryCode: "SA1234",
            bjcpSubcategoryCode: "21A",
            description: "参赛介绍",
            name: "参赛酒名",
            brewery: "参赛酒厂",
          },
        ],
      }).beers[0]
    ).toMatchObject({ categoryRemark: "" });

    expect(updateBeerInputSchema.parse({ name: "只改酒名" })).toEqual({ name: "只改酒名" });
    expect(updateBeerInputSchema.parse({ categoryRemark: "  清空前后空格  " })).toEqual({
      categoryRemark: "清空前后空格",
    });
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
        categoryRemark: "特殊 IPA：冷萃咖啡",
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
      categoryRemark: "特殊 IPA：冷萃咖啡",
    });
  });

  it("defaults missing beer category remarks in response schemas", () => {
    expect(
      beerResultSchema.parse({
        beer: {
          id: 1,
          competitionId: 2,
          entryCode: "SA1234",
          entryNumber: 1,
          bjcpCategoryCode: "21",
          bjcpCategoryName: "IPA",
          bjcpSubcategoryCode: "21A",
          bjcpSubcategoryName: "American IPA",
          description: "参赛介绍",
          name: "参赛酒名",
          brewery: "参赛酒厂",
          createdAt: "2026-07-05T00:00:00.000Z",
          updatedAt: "2026-07-05T00:00:00.000Z",
        },
      }).beer.categoryRemark
    ).toBe("");
  });

  it("parses judge beer result with category remarks and optional BJCP document links", () => {
    const baseBeer = {
      id: 1,
      competitionId: 2,
      roundId: 3,
      entryCode: "SA1234",
      entryNumber: 1,
      bjcpCategoryCode: "21",
      bjcpCategoryName: "IPA",
      bjcpSubcategoryCode: "21A",
      bjcpSubcategoryName: "American IPA",
      categoryRemark: "",
      description: "参赛介绍",
      roundStatus: "ongoing",
      competitionStatus: "ongoing",
      canScore: true,
    };

    expect(
      judgeBeerResultSchema.parse({
        beer: {
          ...baseBeer,
          bjcpSubcategoryDoc: "https://www.bjcp.org/style/2021/21/21A/american-ipa/",
        },
      }).beer
    ).toMatchObject({
      categoryRemark: "",
      bjcpSubcategoryDoc: "https://www.bjcp.org/style/2021/21/21A/american-ipa/",
    });

    expect(judgeBeerResultSchema.parse({ beer: baseBeer }).beer).not.toHaveProperty(
      "bjcpSubcategoryDoc"
    );

    const legacyBeer: Partial<typeof baseBeer> = { ...baseBeer };
    delete legacyBeer.categoryRemark;
    expect(judgeBeerResultSchema.parse({ beer: legacyBeer }).beer.categoryRemark).toBe("");
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

  it("accepts professional score fields for consumer judges", () => {
    const professionalScore = {
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
    };

    expect(
      scoreInputSchema.parse({
        judgeType: judgeTypeConsumer,
        ...professionalScore,
      })
    ).toMatchObject({ judgeType: judgeTypeConsumer, professionalFlavorScore: 18 });

    expect(() =>
      scoreInputSchema.parse({
        judgeType: judgeTypeConsumer,
        amateurDrinkabilityScore: 4,
        amateurBalanceScore: 5,
        amateurFlavorAcceptanceScore: 4,
        amateurRepeatIntentionScore: 5,
        amateurComment: "轻松顺口，愿意复饮",
      })
    ).toThrow();

    expect(() =>
      scoreInputSchema.parse({
        judgeType: "senior_enthusiast",
        ...professionalScore,
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
