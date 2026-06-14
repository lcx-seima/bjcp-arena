import { z } from "zod";
import { competitionStatusSchema } from "./competitions.js";
import { bjcpStyleSnapshotSchema } from "./bjcp-styles.js";

export function boardCompetitionSummaryPath(competitionId: number) {
  return `/api/board/competitions/${competitionId}/summary` as const;
}

export function boardCompetitionEventsPath(competitionId: number) {
  return `/api/board/competitions/${competitionId}/events` as const;
}

export const boardBeerSummarySchema = bjcpStyleSnapshotSchema.extend({
  beerId: z.number().int().positive(),
  entryNumber: z.number().int().positive(),
  realName: z.string().nullable(),
  producer: z.string().nullable(),
  professionalJudgeCount: z.number().int().nonnegative(),
  professionalAverageTotalScore: z.number().nullable(),
  publicJudgeCount: z.number().int().nonnegative(),
  publicAverageOverallPreference: z.number().nullable(),
  publicAverageAromaBodyFoam: z.number().nullable(),
  publicAverageEntryAcceptance: z.number().nullable(),
  publicAverageWillingToDrink: z.number().nullable(),
});

export const boardCompetitionSummarySchema = z.object({
  competition: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    status: competitionStatusSchema,
  }),
  beerCount: z.number().int().nonnegative(),
  beers: z.array(boardBeerSummarySchema),
  updatedAt: z.string().datetime(),
});

export type BoardCompetitionSummary = z.infer<typeof boardCompetitionSummarySchema>;
