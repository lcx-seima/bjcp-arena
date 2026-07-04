import { z } from "zod";

export const competitionListPath = "/api/competitions" as const;

export function competitionByIdPath(competitionId: number) {
  return `/api/competitions/${competitionId}` as const;
}

export function competitionStatusPath(competitionId: number) {
  return `/api/competitions/${competitionId}/status` as const;
}

export const competitionStatuses = ["draft", "judging", "closed", "published"] as const;
export const competitionStatusSchema = z.enum(competitionStatuses);

export const createCompetitionInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});

export const updateCompetitionInputSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const updateCompetitionStatusInputSchema = z.object({
  status: competitionStatusSchema,
});

export const competitionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const competitionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
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

export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;
export type CreateCompetitionInput = z.infer<typeof createCompetitionInputSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionInputSchema>;
export type UpdateCompetitionStatusInput = z.infer<typeof updateCompetitionStatusInputSchema>;
export type CompetitionListQuery = z.infer<typeof competitionListQuerySchema>;
export type CompetitionResult = z.infer<typeof competitionResultSchema>;
export type CompetitionListResult = z.infer<typeof competitionListResultSchema>;
