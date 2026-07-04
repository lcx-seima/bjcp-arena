import { Prisma, type PrismaClient } from "@prisma/client";
import { judgeTypeSchema } from "@bjcp-arena/contracts";
import type { StoredScore, UpsertStoredScoreInput } from "./scores.types.js";

export interface ScoreRepository {
  findScore(beerId: number, judgeUserId: number): Promise<StoredScore | null>;
  upsertScore(input: UpsertStoredScoreInput): Promise<StoredScore>;
}

export function cloneStoredScore(score: StoredScore): StoredScore {
  return {
    ...score,
    submittedAt: new Date(score.submittedAt),
    createdAt: new Date(score.createdAt),
    updatedAt: new Date(score.updatedAt),
  };
}

function toStoredScore(score: Prisma.ScoreGetPayload<object>): StoredScore {
  return {
    id: score.id,
    beerId: score.beerId,
    judgeUserId: score.judgeUserId,
    judgeTypeSnapshot: judgeTypeSchema.parse(score.judgeTypeSnapshot),
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
    publicOverallPreferenceScore: score.publicOverallPreferenceScore,
    publicAromaBodyFoamScore: score.publicAromaBodyFoamScore,
    publicEntryAcceptanceScore: score.publicEntryAcceptanceScore,
    publicWillingToDrinkScore: score.publicWillingToDrinkScore,
    publicComment: score.publicComment,
    submittedAt: new Date(score.submittedAt),
    createdAt: new Date(score.createdAt),
    updatedAt: new Date(score.updatedAt),
  };
}

function toStoredScoreOrNull(score: Prisma.ScoreGetPayload<object> | null) {
  return score ? toStoredScore(score) : null;
}

export function createPrismaScoreRepository(prisma: PrismaClient): ScoreRepository {
  return {
    findScore(beerId, judgeUserId) {
      return prisma.score
        .findUnique({
          where: {
            beerId_judgeUserId: {
              beerId,
              judgeUserId,
            },
          },
        })
        .then(toStoredScoreOrNull);
    },

    async upsertScore(input) {
      const score = await prisma.score.upsert({
        where: {
          beerId_judgeUserId: {
            beerId: input.beerId,
            judgeUserId: input.judgeUserId,
          },
        },
        create: input,
        update: input,
      });
      return toStoredScore(score);
    },
  };
}

export function createMemoryScoreRepository(initialScores: StoredScore[] = []): ScoreRepository {
  const scores = new Map<number, StoredScore>(
    initialScores.map((score) => [score.id, cloneStoredScore(score)])
  );
  let nextId = initialScores.reduce((max, score) => Math.max(max, score.id), 0) + 1;

  return {
    async findScore(beerId, judgeUserId) {
      const score = Array.from(scores.values()).find(
        (candidate) => candidate.beerId === beerId && candidate.judgeUserId === judgeUserId
      );
      return score ? cloneStoredScore(score) : null;
    },

    async upsertScore(input) {
      const existing = Array.from(scores.values()).find(
        (score) => score.beerId === input.beerId && score.judgeUserId === input.judgeUserId
      );
      const now = new Date();
      const upserted: StoredScore = {
        ...input,
        id: existing?.id ?? nextId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      if (!existing) {
        nextId += 1;
      }
      scores.set(upserted.id, upserted);
      return cloneStoredScore(upserted);
    },
  };
}
