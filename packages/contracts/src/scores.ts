import { z } from "zod";
import { judgeTypeSchema } from "./judge-types.js";
import { entityStatusSchema } from "./competitions.js";
import { entryCodeSchema } from "./beers.js";

export const judgeCompetitionListPath = "/api/judge/competitions" as const;

export function judgeRoundListPath(competitionId: number) {
  return `/api/judge/competitions/${competitionId}/rounds` as const;
}

export function judgeRoundDetailPath(competitionId: number, roundId: number) {
  return `/api/judge/competitions/${competitionId}/rounds/${roundId}` as const;
}

export function judgeRoundBeerLookupPath(competitionId: number, roundId: number) {
  return `/api/judge/competitions/${competitionId}/rounds/${roundId}/beer-lookup` as const;
}

export function judgeRoundBeerDetailPath(competitionId: number, roundId: number, beerId: number) {
  return `/api/judge/competitions/${competitionId}/rounds/${roundId}/beers/${beerId}` as const;
}

export function judgeRoundBeerScorePath(competitionId: number, roundId: number, beerId: number) {
  return `/api/judge/competitions/${competitionId}/rounds/${roundId}/beers/${beerId}/my-score` as const;
}

const requiredCommentSchema = z.string().trim().min(1).max(2000);
const nullableScoreCommentSchema = z.string().max(2000).nullable();

export const professionalScoreInputSchema = z.object({
  professionalAromaScore: z.number().int().min(0).max(12),
  professionalAromaComment: requiredCommentSchema,
  professionalAppearanceScore: z.number().int().min(0).max(3),
  professionalAppearanceComment: requiredCommentSchema,
  professionalFlavorScore: z.number().int().min(0).max(20),
  professionalFlavorComment: requiredCommentSchema,
  professionalMouthfeelScore: z.number().int().min(0).max(5),
  professionalMouthfeelComment: requiredCommentSchema,
  professionalOverallScore: z.number().int().min(0).max(10),
  professionalOverallComment: requiredCommentSchema,
});

export const amateurScoreInputSchema = z.object({
  amateurDrinkabilityScore: z.number().int().min(1).max(5),
  amateurBalanceScore: z.number().int().min(1).max(5),
  amateurFlavorAcceptanceScore: z.number().int().min(1).max(5),
  amateurRepeatIntentionScore: z.number().int().min(1).max(5),
  amateurComment: requiredCommentSchema,
});

export const scoreInputSchema = z.discriminatedUnion("judgeType", [
  professionalScoreInputSchema.extend({ judgeType: z.literal("professional") }),
  amateurScoreInputSchema.extend({ judgeType: z.literal("public") }),
]);

export const professionalScoreGrades = [
  "Outstanding",
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
  "Problematic",
] as const;

export const professionalScoreGradeSchema = z.enum(professionalScoreGrades);

export function professionalScoreGrade(total: number) {
  if (total >= 45) return "Outstanding";
  if (total >= 38) return "Excellent";
  if (total >= 30) return "Very Good";
  if (total >= 21) return "Good";
  if (total >= 14) return "Fair";
  return "Problematic";
}

export const myScoreSchema = z.object({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  roundId: z.number().int().positive(),
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
  professionalGrade: professionalScoreGradeSchema.nullable(),
  amateurDrinkabilityScore: z.number().int().min(1).max(5).nullable(),
  amateurBalanceScore: z.number().int().min(1).max(5).nullable(),
  amateurFlavorAcceptanceScore: z.number().int().min(1).max(5).nullable(),
  amateurRepeatIntentionScore: z.number().int().min(1).max(5).nullable(),
  amateurTotalScore: z.number().int().min(4).max(20).nullable(),
  amateurComment: nullableScoreCommentSchema,
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const judgeCompetitionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  status: entityStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const judgeRoundSchema = z.object({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  name: z.string(),
  status: entityStatusSchema,
  submittedBeerCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const judgeCompetitionListResultSchema = z.object({
  competitions: z.array(judgeCompetitionSchema),
});

export const judgeRoundListResultSchema = z.object({
  rounds: z.array(judgeRoundSchema),
});

export const judgeSubmittedBeerSchema = z.object({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  roundId: z.number().int().positive(),
  entryCode: entryCodeSchema,
  entryNumber: z.number().int().positive(),
  bjcpCategoryCode: z.string(),
  bjcpCategoryName: z.string(),
  bjcpSubcategoryCode: z.string(),
  bjcpSubcategoryName: z.string(),
  description: z.string(),
  submittedAt: z.string().datetime(),
});

export const judgeRoundDetailResultSchema = z.object({
  round: judgeRoundSchema,
  beers: z.array(judgeSubmittedBeerSchema),
});

export const judgeBeerLookupInputSchema = z.object({
  entryCode: entryCodeSchema,
});

export const judgeBeerSchema = z.object({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  roundId: z.number().int().positive(),
  entryCode: entryCodeSchema,
  entryNumber: z.number().int().positive(),
  bjcpCategoryCode: z.string(),
  bjcpCategoryName: z.string(),
  bjcpSubcategoryCode: z.string(),
  bjcpSubcategoryName: z.string(),
  description: z.string(),
  roundStatus: entityStatusSchema,
  competitionStatus: entityStatusSchema,
  canScore: z.boolean(),
});

export const judgeBeerResultSchema = z.object({ beer: judgeBeerSchema });
export const myScoreResultSchema = z.object({ score: myScoreSchema.nullable() });
export const submitMyScoreResultSchema = z.object({ score: myScoreSchema });

export type ProfessionalScoreInput = z.infer<typeof professionalScoreInputSchema>;
export type AmateurScoreInput = z.infer<typeof amateurScoreInputSchema>;
export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type MyScoreResult = z.infer<typeof myScoreResultSchema>;
export type SubmitMyScoreResult = z.infer<typeof submitMyScoreResultSchema>;
export type JudgeCompetitionListResult = z.infer<typeof judgeCompetitionListResultSchema>;
export type JudgeRoundListResult = z.infer<typeof judgeRoundListResultSchema>;
export type JudgeRoundDetailResult = z.infer<typeof judgeRoundDetailResultSchema>;
export type JudgeBeerResult = z.infer<typeof judgeBeerResultSchema>;
export type JudgeBeerLookupInput = z.infer<typeof judgeBeerLookupInputSchema>;
