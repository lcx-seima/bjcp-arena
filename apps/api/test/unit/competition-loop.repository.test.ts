import { describe, expect, it, vi } from "vitest";
import {
  amateurScoreInputSchema,
  judgeRole,
  professionalScoreInputSchema,
  type ImportBeerRow,
  type JudgeType,
} from "@bjcp-arena/contracts";
import {
  createMemoryCompetitionLoopRepository,
  createPrismaCompetitionLoopRepository,
} from "../../src/modules/competition-loop/competition-loop.repository.js";

function importRow(entryCode: string, rowNumber: number): ImportBeerRow {
  return {
    rowNumber,
    entryCode,
    bjcpSubcategoryCode: "21A",
    categoryRemark: "",
    description: "介绍",
    name: "酒款",
    brewery: "酒厂",
  };
}

function judgeSnapshot(id: number, judgeType: JudgeType) {
  return {
    id,
    username: `judge${id}`,
    nickname: `裁判 ${id}`,
    roles: judgeRole,
    judgeType,
    disabled: false,
    authVersion: 0,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  };
}

describe("competition loop repository beer import", () => {
  it("does not commit staged rows when an atomic memory import fails", async () => {
    const repository = createMemoryCompetitionLoopRepository();
    const competition = await repository.createCompetition({ name: "原子导入测试" });
    const invalid = {
      ...importRow("SA0002", 3),
      bjcpSubcategoryCode: "INVALID" as ImportBeerRow["bjcpSubcategoryCode"],
    };

    await expect(
      repository.upsertBeersAtomically(competition.id, [importRow("SA0001", 2), invalid])
    ).rejects.toThrow("BJCP subcategory not found");
    await expect(repository.listBeers(competition.id)).resolves.toEqual([]);
  });

  it("aggregates active memory scores by beer and score scale", async () => {
    const repository = createMemoryCompetitionLoopRepository();
    const competition = await repository.createCompetition({ name: "评分聚合测试" });
    const beer = (await repository.upsertBeer(competition.id, importRow("SA0001", 2))).beer;
    const round = await repository.createRound(competition.id, { name: "第一轮" });
    await repository.addRoundBeer(competition.id, round.id, beer.id);
    const professionalScore = professionalScoreInputSchema.parse({
      professionalAromaScore: 10,
      professionalAromaComment: "香气",
      professionalAppearanceScore: 3,
      professionalAppearanceComment: "外观",
      professionalFlavorScore: 18,
      professionalFlavorComment: "风味",
      professionalMouthfeelScore: 4,
      professionalMouthfeelComment: "口感",
      professionalOverallScore: 8,
      professionalOverallComment: "总体",
    });
    const publicScore = amateurScoreInputSchema.parse({
      amateurDrinkabilityScore: 4,
      amateurBalanceScore: 5,
      amateurFlavorAcceptanceScore: 4,
      amateurRepeatIntentionScore: 5,
      amateurComment: "总体",
    });

    await repository.upsertScore({
      competitionId: competition.id,
      roundId: round.id,
      beerId: beer.id,
      currentUser: judgeSnapshot(1, "professional"),
      score: { judgeType: "professional", ...professionalScore },
    });
    await repository.upsertScore({
      competitionId: competition.id,
      roundId: round.id,
      beerId: beer.id,
      currentUser: judgeSnapshot(2, "consumer"),
      score: {
        judgeType: "consumer",
        ...professionalScore,
        professionalAromaScore: 8,
        professionalFlavorScore: 16,
      },
    });
    await repository.upsertScore({
      competitionId: competition.id,
      roundId: round.id,
      beerId: beer.id,
      currentUser: judgeSnapshot(3, "public"),
      score: { judgeType: "public", ...publicScore },
    });

    await expect(repository.listActiveScoreStatisticsByBeer(round.id)).resolves.toEqual([
      {
        beerId: beer.id,
        fiftyPointScoreCount: 2,
        fiftyPointAverageScore: 41,
        twentyPointScoreCount: 1,
        twentyPointAverageScore: 18,
      },
    ]);

    await repository.softDeleteActiveScore(round.id, beer.id, 3);
    await expect(repository.listActiveScoreStatisticsByBeer(round.id)).resolves.toEqual([
      {
        beerId: beer.id,
        fiftyPointScoreCount: 2,
        fiftyPointAverageScore: 41,
        twentyPointScoreCount: 0,
        twentyPointAverageScore: null,
      },
    ]);
  });

  it("uses one database groupBy query for all round beer score statistics", async () => {
    const groupBy = vi.fn().mockResolvedValue([
      {
        beerId: 2,
        _count: { professionalTotalScore: 2, amateurTotalScore: 1 },
        _avg: { professionalTotalScore: 41, amateurTotalScore: 18 },
      },
    ]);
    const repository = createPrismaCompetitionLoopRepository({ score: { groupBy } } as never);

    await expect(repository.listActiveScoreStatisticsByBeer(3)).resolves.toEqual([
      {
        beerId: 2,
        fiftyPointScoreCount: 2,
        fiftyPointAverageScore: 41,
        twentyPointScoreCount: 1,
        twentyPointAverageScore: 18,
      },
    ]);
    expect(groupBy).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledWith({
      by: ["beerId"],
      where: { roundId: 3, deletedAt: null },
      _count: { professionalTotalScore: true, amateurTotalScore: true },
      _avg: { professionalTotalScore: true, amateurTotalScore: true },
    });
  });
});
