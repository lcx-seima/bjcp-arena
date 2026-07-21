import type {
  AddRoundBeerInput,
  CompetitionListQuery,
  CompetitionStatus,
  CreateBeerInput,
  CreateCompetitionInput,
  CreateRoundInput,
  EntityStatus,
  ImportBeersInput,
  RemoveRoundBeerInput,
  ScoreInput,
  UpdateBeerInput,
  UpdateCompetitionInput,
  UpdateRoundInput,
} from "@bjcp-arena/contracts";
import {
  findBjcpSubcategory,
  isProfessionalScoreJudgeType,
  normalizeEntryCode,
} from "@bjcp-arena/contracts";
import type { AuthUserSnapshot } from "../auth/auth-user-snapshot-store.js";
import type {
  CompetitionLoopRepository,
  StoredBeer,
  StoredCompetition,
  StoredRound,
  StoredScore,
} from "./competition-loop.repository.js";

export class CompetitionLoopError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export interface CompetitionLoopServiceDependencies {
  repository: CompetitionLoopRepository;
}

function toIso(date: Date) {
  return date.toISOString();
}

function toCompetition(competition: StoredCompetition) {
  return {
    id: competition.id,
    name: competition.name,
    status: competition.status,
    createdAt: toIso(competition.createdAt),
    updatedAt: toIso(competition.updatedAt),
  };
}

function toBeer(beer: StoredBeer) {
  return {
    id: beer.id,
    competitionId: beer.competitionId,
    entryCode: beer.entryCode,
    entryNumber: beer.entryNumber,
    bjcpCategoryCode: beer.bjcpCategoryCode,
    bjcpCategoryName: beer.bjcpCategoryName,
    bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
    bjcpSubcategoryName: beer.bjcpSubcategoryName,
    categoryRemark: beer.categoryRemark ?? "",
    description: beer.description,
    name: beer.name,
    brewery: beer.brewery,
    createdAt: toIso(beer.createdAt),
    updatedAt: toIso(beer.updatedAt),
  };
}

function toRound(round: StoredRound, beerCount: number, scoreCount: number) {
  return {
    id: round.id,
    competitionId: round.competitionId,
    name: round.name,
    status: round.status,
    beerCount,
    scoreCount,
    createdAt: toIso(round.createdAt),
    updatedAt: toIso(round.updatedAt),
  };
}

function toScore(score: StoredScore) {
  return {
    id: score.id,
    competitionId: score.competitionId,
    roundId: score.roundId,
    beerId: score.beerId,
    judgeUserId: score.judgeUserId,
    judgeTypeSnapshot: score.judgeTypeSnapshot,
    judgeNicknameSnapshot: score.judgeNicknameSnapshot,
    professionalAromaScore: score.professionalAromaScore,
    professionalAromaComment: score.professionalAromaComment,
    professionalAppearanceScore: score.professionalAppearanceScore,
    professionalAppearanceComment: score.professionalAppearanceComment,
    professionalFlavorScore: score.professionalFlavorScore,
    professionalFlavorComment: score.professionalFlavorComment,
    professionalMouthfeelScore: score.professionalMouthfeelScore,
    professionalMouthfeelComment: score.professionalMouthfeelComment,
    professionalOverallScore: score.professionalOverallScore,
    professionalOverallComment: score.professionalOverallComment,
    professionalTotalScore: score.professionalTotalScore,
    professionalGrade: score.professionalGrade,
    amateurDrinkabilityScore: score.amateurDrinkabilityScore,
    amateurBalanceScore: score.amateurBalanceScore,
    amateurFlavorAcceptanceScore: score.amateurFlavorAcceptanceScore,
    amateurRepeatIntentionScore: score.amateurRepeatIntentionScore,
    amateurTotalScore: score.amateurTotalScore,
    amateurComment: score.amateurComment,
    submittedAt: toIso(score.submittedAt),
    updatedAt: toIso(score.updatedAt),
  };
}

function requireStoredTotalScore(score: StoredScore) {
  const totalScore = isProfessionalScoreJudgeType(score.judgeTypeSnapshot)
    ? score.professionalTotalScore
    : score.amateurTotalScore;
  if (totalScore === null) {
    throw new CompetitionLoopError("已提交评价缺少已落库总分", 500);
  }
  return totalScore;
}

function toJudgeBeer(
  competition: StoredCompetition,
  round: StoredRound,
  beer: StoredBeer,
  canScore: boolean
) {
  const style = findBjcpSubcategory(beer.bjcpSubcategoryCode);
  return {
    id: beer.id,
    competitionId: competition.id,
    roundId: round.id,
    entryCode: beer.entryCode,
    entryNumber: beer.entryNumber,
    bjcpCategoryCode: beer.bjcpCategoryCode,
    bjcpCategoryName: beer.bjcpCategoryName,
    bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
    bjcpSubcategoryName: beer.bjcpSubcategoryName,
    categoryRemark: beer.categoryRemark ?? "",
    description: beer.description,
    roundStatus: round.status,
    competitionStatus: competition.status,
    ...(style && "doc" in style && style.doc ? { bjcpSubcategoryDoc: style.doc } : {}),
    canScore,
  };
}

function assertOngoing(status: CompetitionStatus, message: string) {
  if (status !== "ongoing") {
    throw new CompetitionLoopError(message, 409);
  }
}

export function createCompetitionLoopService({ repository }: CompetitionLoopServiceDependencies) {
  async function requireCompetition(competitionId: number) {
    const competition = await repository.findCompetition(competitionId);
    if (!competition) {
      throw new CompetitionLoopError("比赛不存在", 404);
    }
    return competition;
  }

  async function requireJudgeCompetition(competitionId: number) {
    const competition = await requireCompetition(competitionId);
    if (competition.status === "archived") {
      throw new CompetitionLoopError("比赛不存在", 404);
    }
    return competition;
  }

  async function requireRound(competitionId: number, roundId: number) {
    const round = await repository.findRound(competitionId, roundId);
    if (!round) {
      throw new CompetitionLoopError("轮次不存在", 404);
    }
    return round;
  }

  async function requireBeer(competitionId: number, beerId: number) {
    const beer = await repository.findBeer(competitionId, beerId);
    if (!beer) {
      throw new CompetitionLoopError("酒款不存在", 404);
    }
    return beer;
  }

  async function ensureCompetitionWritable(competitionId: number) {
    const competition = await requireCompetition(competitionId);
    assertOngoing(
      competition.status,
      competition.status === "archived" ? "比赛已归档，不能继续修改" : "比赛已关闭，不能继续修改"
    );
    return competition;
  }

  async function ensureRoundWritable(competitionId: number, roundId: number) {
    const competition = await ensureCompetitionWritable(competitionId);
    const round = await requireRound(competitionId, roundId);
    assertOngoing(round.status, "轮次已结束，不能继续修改");
    return { competition, round };
  }

  async function roundView(round: StoredRound) {
    const beers = await repository.listRoundBeers(round.competitionId, round.id);
    const scoreCount = await repository.countActiveScores(round.id);
    return toRound(round, beers.length, scoreCount);
  }

  return {
    async listCompetitions(options: CompetitionListQuery) {
      const all = await repository.listCompetitions(options.archiveScope);
      const start = (options.page - 1) * options.limit;
      return {
        competitions: all.slice(start, start + options.limit).map(toCompetition),
        total: await repository.countCompetitions(options.archiveScope),
        page: options.page,
        limit: options.limit,
      };
    },

    async createCompetition(input: CreateCompetitionInput) {
      return { competition: toCompetition(await repository.createCompetition(input)) };
    },

    async getCompetition(competitionId: number) {
      return { competition: toCompetition(await requireCompetition(competitionId)) };
    },

    async updateCompetition(competitionId: number, input: UpdateCompetitionInput) {
      await ensureCompetitionWritable(competitionId);
      const competition = await repository.updateCompetition(competitionId, input);
      if (!competition) throw new CompetitionLoopError("比赛不存在", 404);
      return { competition: toCompetition(competition) };
    },

    async updateCompetitionStatus(
      competitionId: number,
      input: { status: CompetitionStatus; confirm?: boolean | undefined }
    ) {
      const competition = await requireCompetition(competitionId);
      if (competition.status === input.status) {
        return { competition: toCompetition(competition) };
      }

      if (competition.status === "archived") {
        if (input.status !== "ended") {
          throw new CompetitionLoopError("归档比赛需先恢复为已关闭状态", 409);
        }
      } else if (competition.status === "ongoing" && input.status !== "ended") {
        throw new CompetitionLoopError("比赛进行中不能直接归档", 409);
      }

      if (competition.status === "ended" && input.status === "ongoing" && !input.confirm) {
        throw new CompetitionLoopError("重新打开比赛需要二次确认", 409);
      }
      if (competition.status === "ended" && input.status === "archived" && !input.confirm) {
        throw new CompetitionLoopError("归档比赛需要二次确认", 409);
      }
      if (input.status === "ended") {
        const openRounds = (await repository.listRounds(competitionId)).filter(
          (round) => round.status === "ongoing"
        );
        if (openRounds.length > 0) {
          throw new CompetitionLoopError("仍有进行中轮次，不能关闭比赛", 409, {
            openRoundCount: openRounds.length,
          });
        }
      }
      const updated = await repository.updateCompetition(competitionId, { status: input.status });
      if (!updated) throw new CompetitionLoopError("比赛不存在", 404);
      return { competition: toCompetition(updated) };
    },

    async listBeers(competitionId: number) {
      await requireCompetition(competitionId);
      return { beers: (await repository.listBeers(competitionId)).map(toBeer) };
    },

    async upsertBeer(competitionId: number, input: CreateBeerInput) {
      await ensureCompetitionWritable(competitionId);
      const row = { ...input, entryCode: normalizeEntryCode(input.entryCode), rowNumber: 2 };
      const result = await repository.upsertBeer(competitionId, row);
      return { beer: toBeer(result.beer) };
    },

    async importBeers(competitionId: number, input: ImportBeersInput) {
      await ensureCompetitionWritable(competitionId);
      for (const row of input.beers) {
        try {
          normalizeEntryCode(row.entryCode);
          if (!findBjcpSubcategory(row.bjcpSubcategoryCode)) {
            throw new Error("BJCP 类型不存在");
          }
        } catch (error) {
          throw new CompetitionLoopError(
            `第 ${row.rowNumber} 行：${error instanceof Error ? error.message : "格式错误"}`,
            400
          );
        }
      }
      let created = 0;
      let updated = 0;
      const beers = [];
      for (const row of input.beers) {
        const result = await repository.upsertBeer(competitionId, {
          ...row,
          entryCode: normalizeEntryCode(row.entryCode),
        });
        if (result.created) created += 1;
        else updated += 1;
        beers.push(toBeer(result.beer));
      }
      return { created, updated, beers };
    },

    async updateBeer(competitionId: number, beerId: number, input: UpdateBeerInput) {
      await ensureCompetitionWritable(competitionId);
      const existing = await requireBeer(competitionId, beerId);
      const result = await repository.upsertBeer(competitionId, {
        rowNumber: 2,
        entryCode: existing.entryCode,
        bjcpSubcategoryCode: (input.bjcpSubcategoryCode ?? existing.bjcpSubcategoryCode) as
          | "10A"
          | "21A"
          | "21B",
        categoryRemark: input.categoryRemark ?? existing.categoryRemark,
        description: input.description ?? existing.description,
        name: input.name ?? existing.name,
        brewery: input.brewery ?? existing.brewery,
      });
      return { beer: toBeer(result.beer) };
    },

    async listRounds(competitionId: number) {
      await requireCompetition(competitionId);
      const rounds = await Promise.all((await repository.listRounds(competitionId)).map(roundView));
      return { rounds };
    },

    async createRound(competitionId: number, input: CreateRoundInput) {
      await ensureCompetitionWritable(competitionId);
      const round = await repository.createRound(competitionId, input);
      return { round: await roundView(round) };
    },

    async updateRound(competitionId: number, roundId: number, input: UpdateRoundInput) {
      await ensureRoundWritable(competitionId, roundId);
      const round = await repository.updateRound(competitionId, roundId, input);
      if (!round) throw new CompetitionLoopError("轮次不存在", 404);
      return { round: await roundView(round) };
    },

    async updateRoundStatus(
      competitionId: number,
      roundId: number,
      input: { status: EntityStatus; confirm?: boolean | undefined }
    ) {
      const competition = await requireCompetition(competitionId);
      assertOngoing(competition.status, "比赛已关闭，不能修改轮次");
      const round = await requireRound(competitionId, roundId);
      if (round.status === input.status) {
        return { round: await roundView(round) };
      }
      if (round.status === "ended" && input.status === "ongoing" && !input.confirm) {
        throw new CompetitionLoopError("重新打开轮次需要二次确认", 409);
      }
      const updated = await repository.updateRound(competitionId, roundId, {
        status: input.status,
      });
      if (!updated) throw new CompetitionLoopError("轮次不存在", 404);
      return { round: await roundView(updated) };
    },

    async deleteRound(competitionId: number, roundId: number) {
      await ensureCompetitionWritable(competitionId);
      await requireRound(competitionId, roundId);
      const roundBeers = await repository.listRoundBeers(competitionId, roundId);
      if (roundBeers.length > 0) {
        throw new CompetitionLoopError("轮次内仍有酒款，不能删除轮次", 409, {
          beerCount: roundBeers.length,
        });
      }
      await repository.deleteRound(competitionId, roundId);
      return { ok: true };
    },

    async listRoundBeers(competitionId: number, roundId: number) {
      await requireRound(competitionId, roundId);
      const beers = await Promise.all(
        (await repository.listRoundBeers(competitionId, roundId)).map(async (binding) => ({
          id: binding.id,
          roundId: binding.roundId,
          beerId: binding.beerId,
          competitionId: binding.competitionId,
          entryCode: binding.beer.entryCode,
          entryNumber: binding.beer.entryNumber,
          bjcpCategoryCode: binding.beer.bjcpCategoryCode,
          bjcpCategoryName: binding.beer.bjcpCategoryName,
          bjcpSubcategoryCode: binding.beer.bjcpSubcategoryCode,
          bjcpSubcategoryName: binding.beer.bjcpSubcategoryName,
          description: binding.beer.description,
          scoreCount: await repository.countActiveScores(roundId, binding.beerId),
          createdAt: toIso(binding.createdAt),
        }))
      );
      return { beers };
    },

    async addRoundBeer(competitionId: number, roundId: number, input: AddRoundBeerInput) {
      await ensureRoundWritable(competitionId, roundId);
      await requireBeer(competitionId, input.beerId);
      const binding = await repository.addRoundBeer(competitionId, roundId, input.beerId);
      return {
        beer: {
          id: binding.id,
          roundId: binding.roundId,
          beerId: binding.beerId,
          competitionId: binding.competitionId,
          entryCode: binding.beer.entryCode,
          entryNumber: binding.beer.entryNumber,
          bjcpCategoryCode: binding.beer.bjcpCategoryCode,
          bjcpCategoryName: binding.beer.bjcpCategoryName,
          bjcpSubcategoryCode: binding.beer.bjcpSubcategoryCode,
          bjcpSubcategoryName: binding.beer.bjcpSubcategoryName,
          description: binding.beer.description,
          scoreCount: await repository.countActiveScores(roundId, binding.beerId),
          createdAt: toIso(binding.createdAt),
        },
      };
    },

    async removeRoundBeer(
      competitionId: number,
      roundId: number,
      beerId: number,
      input: RemoveRoundBeerInput
    ) {
      await ensureRoundWritable(competitionId, roundId);
      const binding = await repository.findRoundBeer(competitionId, roundId, beerId);
      if (!binding) {
        throw new CompetitionLoopError("轮次酒款不存在", 404);
      }
      const scoreCount = await repository.countActiveScores(roundId, beerId);
      if (scoreCount > 0 && !input.confirm) {
        throw new CompetitionLoopError("该酒款已有评价，移除需要二次确认", 409, {
          scoreCount,
        });
      }
      await repository.removeRoundBeer(competitionId, roundId, beerId);
      if (scoreCount > 0) {
        await repository.softDeleteScores(roundId, beerId);
      }
      return { ok: true };
    },

    async listJudgeCompetitions() {
      const competitions = (await repository.listCompetitions("unarchived"))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "ongoing" ? -1 : 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .map(toCompetition);
      return { competitions };
    },

    async listJudgeRounds(competitionId: number, currentUser: AuthUserSnapshot) {
      const competition = await requireJudgeCompetition(competitionId);
      const rounds = await Promise.all(
        (await repository.listRounds(competitionId)).map(async (round) => ({
          id: round.id,
          competitionId: round.competitionId,
          name: round.name,
          status: round.status,
          submittedBeerCount: (await repository.listActiveScoresByJudge(round.id, currentUser.id))
            .length,
          createdAt: toIso(round.createdAt),
          updatedAt: toIso(round.updatedAt),
        }))
      );
      return { competition: toCompetition(competition), rounds };
    },

    async getJudgeRound(competitionId: number, roundId: number, currentUser: AuthUserSnapshot) {
      await requireJudgeCompetition(competitionId);
      const round = await requireRound(competitionId, roundId);
      const scores = await repository.listActiveScoresByJudge(roundId, currentUser.id);
      return {
        round: {
          id: round.id,
          competitionId: round.competitionId,
          name: round.name,
          status: round.status,
          submittedBeerCount: scores.length,
          createdAt: toIso(round.createdAt),
          updatedAt: toIso(round.updatedAt),
        },
        beers: scores.map((score) => ({
          id: score.beer.id,
          competitionId: score.beer.competitionId,
          roundId,
          entryCode: score.beer.entryCode,
          entryNumber: score.beer.entryNumber,
          totalScore: requireStoredTotalScore(score),
          bjcpCategoryCode: score.beer.bjcpCategoryCode,
          bjcpCategoryName: score.beer.bjcpCategoryName,
          bjcpSubcategoryCode: score.beer.bjcpSubcategoryCode,
          bjcpSubcategoryName: score.beer.bjcpSubcategoryName,
          description: score.beer.description,
          submittedAt: toIso(score.submittedAt),
        })),
      };
    },

    async lookupJudgeBeer(
      competitionId: number,
      roundId: number,
      entryCode: string,
      currentUser: AuthUserSnapshot
    ) {
      const competition = await requireJudgeCompetition(competitionId);
      const round = await requireRound(competitionId, roundId);
      const normalized = normalizeEntryCode(entryCode);
      const binding = (await repository.listRoundBeers(competitionId, roundId)).find(
        (candidate) => candidate.beer.entryCode === normalized
      );
      if (!binding) {
        throw new CompetitionLoopError("本轮次未找到该参赛编号", 404);
      }
      return {
        beer: toJudgeBeer(
          competition,
          round,
          binding.beer,
          competition.status === "ongoing" &&
            round.status === "ongoing" &&
            currentUser.judgeType !== null
        ),
      };
    },

    async getJudgeBeer(
      competitionId: number,
      roundId: number,
      beerId: number,
      currentUser: AuthUserSnapshot
    ) {
      const competition = await requireJudgeCompetition(competitionId);
      const round = await requireRound(competitionId, roundId);
      const binding = await repository.findRoundBeer(competitionId, roundId, beerId);
      if (!binding) {
        throw new CompetitionLoopError("本轮次未找到该酒款", 404);
      }
      return {
        beer: toJudgeBeer(
          competition,
          round,
          binding.beer,
          competition.status === "ongoing" &&
            round.status === "ongoing" &&
            currentUser.judgeType !== null
        ),
      };
    },

    async getMyScore(
      competitionId: number,
      roundId: number,
      beerId: number,
      currentUser: AuthUserSnapshot
    ) {
      await requireJudgeCompetition(competitionId);
      await requireRound(competitionId, roundId);
      const binding = await repository.findRoundBeer(competitionId, roundId, beerId);
      if (!binding) throw new CompetitionLoopError("本轮次未找到该酒款", 404);
      const score = await repository.findActiveScore(roundId, beerId, currentUser.id);
      return { score: score ? toScore(score) : null };
    },

    async submitMyScore(
      competitionId: number,
      roundId: number,
      beerId: number,
      currentUser: AuthUserSnapshot,
      score: ScoreInput
    ) {
      const competition = await requireJudgeCompetition(competitionId);
      const round = await requireRound(competitionId, roundId);
      assertOngoing(competition.status, "比赛已关闭，不能提交评分");
      assertOngoing(round.status, "轮次已结束，不能提交评分");
      const binding = await repository.findRoundBeer(competitionId, roundId, beerId);
      if (!binding) throw new CompetitionLoopError("本轮次未找到该酒款", 404);
      const existingScore = await repository.findActiveScore(roundId, beerId, currentUser.id);
      const expectedJudgeType = existingScore?.judgeTypeSnapshot ?? currentUser.judgeType;
      if (!expectedJudgeType) {
        throw new CompetitionLoopError("当前账号未设置裁判类型", 409);
      }
      if (expectedJudgeType !== score.judgeType) {
        throw new CompetitionLoopError(
          existingScore ? "评分表类型与已有评分类型不一致" : "评分表类型与账号裁判类型不一致",
          409
        );
      }
      const saved = await repository.upsertScore({
        competitionId,
        roundId,
        beerId,
        currentUser,
        score,
      });
      return { score: toScore(saved) };
    },

    async deleteMyScore(
      competitionId: number,
      roundId: number,
      beerId: number,
      currentUser: AuthUserSnapshot
    ) {
      const competition = await requireJudgeCompetition(competitionId);
      const round = await requireRound(competitionId, roundId);
      assertOngoing(competition.status, "比赛已关闭，不能删除评分");
      assertOngoing(round.status, "轮次已结束，不能删除评分");
      const binding = await repository.findRoundBeer(competitionId, roundId, beerId);
      if (!binding) throw new CompetitionLoopError("本轮次未找到该酒款", 404);
      const existingScore = await repository.findActiveScore(roundId, beerId, currentUser.id);
      if (!existingScore) {
        throw new CompetitionLoopError("当前评分不存在", 404);
      }
      const deletedCount = await repository.softDeleteActiveScore(roundId, beerId, currentUser.id);
      if (deletedCount === 0) {
        throw new CompetitionLoopError("当前评分不存在", 404);
      }
      return { ok: true };
    },
  };
}
