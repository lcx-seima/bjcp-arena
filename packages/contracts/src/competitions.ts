import { z } from "zod";

export const competitionListPath = "/api/competitions" as const;

export function competitionByIdPath(competitionId: number) {
  return `/api/competitions/${competitionId}` as const;
}

export function competitionStatusPath(competitionId: number) {
  return `/api/competitions/${competitionId}/status` as const;
}

export const entityStatuses = ["ongoing", "ended"] as const;
export const entityStatusSchema = z.enum(entityStatuses);
export const competitionStatuses = [...entityStatuses, "archived"] as const;
export const competitionStatusSchema = z.enum(competitionStatuses);
export const competitionArchiveScopes = ["unarchived", "archived"] as const;
export const competitionArchiveScopeSchema = z.enum(competitionArchiveScopes);

export const createCompetitionInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateCompetitionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const updateEntityStatusInputSchema = z.object({
  status: entityStatusSchema,
  confirm: z.boolean().optional(),
});

export const updateCompetitionStatusInputSchema = z.object({
  status: competitionStatusSchema,
  confirm: z.boolean().optional(),
});

export const competitionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  archiveScope: competitionArchiveScopeSchema.default("unarchived"),
});

export const competitionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  status: competitionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const competitionListResultSchema = z.object({
  competitions: z.array(competitionSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
});

export const competitionResultSchema = z.object({
  competition: competitionSchema,
});

export function roundListPath(competitionId: number) {
  return `/api/competitions/${competitionId}/rounds` as const;
}

export function roundByIdPath(competitionId: number, roundId: number) {
  return `/api/competitions/${competitionId}/rounds/${roundId}` as const;
}

export function roundStatusPath(competitionId: number, roundId: number) {
  return `/api/competitions/${competitionId}/rounds/${roundId}/status` as const;
}

export function roundBeerPath(competitionId: number, roundId: number) {
  return `/api/competitions/${competitionId}/rounds/${roundId}/beers` as const;
}

export const createRoundInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateRoundInputSchema = createRoundInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const roundSchema = z.object({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  status: entityStatusSchema,
  beerCount: z.number().int().nonnegative(),
  scoreCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const roundListResultSchema = z.object({
  rounds: z.array(roundSchema),
});

export const roundResultSchema = z.object({
  round: roundSchema,
});

export const addRoundBeerInputSchema = z.object({
  beerId: z.number().int().positive(),
});

export const removeRoundBeerInputSchema = z.object({
  confirm: z.boolean().optional(),
});

export const roundBeerSchema = z.object({
  id: z.number().int().positive(),
  roundId: z.number().int().positive(),
  beerId: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  entryCode: z.string(),
  entryNumber: z.number().int().positive(),
  bjcpCategoryCode: z.string(),
  bjcpCategoryName: z.string(),
  bjcpSubcategoryCode: z.string(),
  bjcpSubcategoryName: z.string(),
  description: z.string(),
  name: z.string(),
  brewery: z.string(),
  scoreCount: z.number().int().nonnegative(),
  professionalScoreCount: z.number().int().nonnegative(),
  professionalAverageScore: z.number().min(0).max(50).nullable(),
  consumerScoreCount: z.number().int().nonnegative(),
  consumerAverageScore: z.number().min(0).max(50).nullable(),
  weightedFiftyPointAverageScore: z.number().min(0).max(50).nullable(),
  publicScoreCount: z.number().int().nonnegative(),
  publicAverageScore: z.number().min(4).max(20).nullable(),
  createdAt: z.string().datetime(),
});

export const roundBeerListResultSchema = z.object({
  beers: z.array(roundBeerSchema),
});

export const roundBeerResultSchema = z.object({
  beer: roundBeerSchema,
});

export type EntityStatus = z.infer<typeof entityStatusSchema>;
export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;
export type CompetitionArchiveScope = z.infer<typeof competitionArchiveScopeSchema>;
export type CreateCompetitionInput = z.infer<typeof createCompetitionInputSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionInputSchema>;
export type UpdateEntityStatusInput = z.infer<typeof updateEntityStatusInputSchema>;
export type UpdateCompetitionStatusInput = z.infer<typeof updateCompetitionStatusInputSchema>;
export type CompetitionListQuery = z.infer<typeof competitionListQuerySchema>;
export type CompetitionResult = z.infer<typeof competitionResultSchema>;
export type CompetitionListResult = z.infer<typeof competitionListResultSchema>;
export type CreateRoundInput = z.infer<typeof createRoundInputSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundInputSchema>;
export type RoundResult = z.infer<typeof roundResultSchema>;
export type RoundListResult = z.infer<typeof roundListResultSchema>;
export type AddRoundBeerInput = z.infer<typeof addRoundBeerInputSchema>;
export type RemoveRoundBeerInput = z.infer<typeof removeRoundBeerInputSchema>;
export type RoundBeerListResult = z.infer<typeof roundBeerListResultSchema>;
export type RoundBeerResult = z.infer<typeof roundBeerResultSchema>;
