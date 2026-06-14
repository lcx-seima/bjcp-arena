import { z } from "zod";
import { judgeTypeSchema } from "./judge-types.js";

export function judgeBeerDetailPath(competitionId: number, beerId: number) {
  return `/api/judge/competitions/${competitionId}/beers/${beerId}` as const;
}

export function judgeMyScorePath(competitionId: number, beerId: number) {
  return `/api/judge/competitions/${competitionId}/beers/${beerId}/my-score` as const;
}

const scoreCommentSchema = z.string().max(2000).optional();

export const professionalScoreInputSchema = z.object({
  professionalAromaScore: z.number().int().min(0).max(12),
  professionalAromaComment: scoreCommentSchema,
  professionalAppearanceScore: z.number().int().min(0).max(3),
  professionalAppearanceComment: scoreCommentSchema,
  professionalFlavorScore: z.number().int().min(0).max(20),
  professionalFlavorComment: scoreCommentSchema,
  professionalMouthfeelScore: z.number().int().min(0).max(5),
  professionalMouthfeelComment: scoreCommentSchema,
  professionalOverallScore: z.number().int().min(0).max(10),
  professionalOverallComment: scoreCommentSchema,
});

export const publicScoreInputSchema = z.object({
  publicOverallPreferenceScore: z.number().int().min(1).max(10),
  publicAromaBodyFoamScore: z.number().int().min(1).max(5),
  publicEntryAcceptanceScore: z.number().int().min(1).max(5),
  publicWillingToDrinkScore: z.number().int().min(1).max(5),
  publicComment: scoreCommentSchema,
});

export const scoreInputSchema = z.discriminatedUnion("judgeType", [
  professionalScoreInputSchema.extend({ judgeType: z.literal("professional") }),
  publicScoreInputSchema.extend({ judgeType: z.literal("public") }),
]);

const nullableScoreCommentSchema = z.string().max(2000).nullable();

export const myScoreSchema = z.object({
  id: z.number().int().positive(),
  beerId: z.number().int().positive(),
  judgeUserId: z.number().int().positive(),
  judgeTypeSnapshot: judgeTypeSchema,
  judgeNicknameSnapshot: z.string(),
  professionalAromaScore: z.number().int().min(0).max(12).nullable(),
  professionalAromaComment: nullableScoreCommentSchema,
  professionalAppearanceScore: z.number().int().min(0).max(3).nullable(),
  professionalAppearanceComment: nullableScoreCommentSchema,
  professionalFlavorScore: z.number().int().min(0).max(20).nullable(),
  professionalFlavorComment: nullableScoreCommentSchema,
  professionalMouthfeelScore: z.number().int().min(0).max(5).nullable(),
  professionalMouthfeelComment: nullableScoreCommentSchema,
  professionalOverallScore: z.number().int().min(0).max(10).nullable(),
  professionalOverallComment: nullableScoreCommentSchema,
  professionalTotalScore: z.number().int().min(0).max(50).nullable(),
  publicOverallPreferenceScore: z.number().int().min(1).max(10).nullable(),
  publicAromaBodyFoamScore: z.number().int().min(1).max(5).nullable(),
  publicEntryAcceptanceScore: z.number().int().min(1).max(5).nullable(),
  publicWillingToDrinkScore: z.number().int().min(1).max(5).nullable(),
  publicComment: nullableScoreCommentSchema,
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const myScoreResultSchema = z.object({
  score: myScoreSchema.nullable(),
});

export const submitMyScoreResultSchema = z.object({
  score: myScoreSchema,
});

export type ProfessionalScoreInput = z.infer<typeof professionalScoreInputSchema>;
export type PublicScoreInput = z.infer<typeof publicScoreInputSchema>;
export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type MyScoreResult = z.infer<typeof myScoreResultSchema>;
export type SubmitMyScoreResult = z.infer<typeof submitMyScoreResultSchema>;
