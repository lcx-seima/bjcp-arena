import { z } from "zod";
import { bjcpStyleSnapshotSchema, bjcpSubcategoryCodeSchema } from "./bjcp-styles.js";
import { competitionStatusSchema } from "./competitions.js";

export function beerListPath(competitionId: number) {
  return `/api/competitions/${competitionId}/beers` as const;
}

export function beerByIdPath(competitionId: number, beerId: number) {
  return `/api/competitions/${competitionId}/beers/${beerId}` as const;
}

export function beerStatusPath(competitionId: number, beerId: number) {
  return `/api/competitions/${competitionId}/beers/${beerId}/status` as const;
}

export function beerQrCodesPath(competitionId: number) {
  return `/api/competitions/${competitionId}/qr-codes` as const;
}

export const beerStatuses = ["draft", "published", "removed"] as const;
export const beerStatusSchema = z.enum(beerStatuses);

export const createBeerInputSchema = z.object({
  realName: z.string().min(1).max(160),
  producer: z.string().min(1).max(160),
  bjcpSubcategoryCode: bjcpSubcategoryCodeSchema,
  description: z.string().min(1).max(5000),
});

export const updateBeerInputSchema = createBeerInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const updateBeerStatusInputSchema = z.object({
  status: beerStatusSchema,
});

export const beerSchema = bjcpStyleSnapshotSchema.extend({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  entryNumber: z.number().int().positive(),
  realName: z.string(),
  producer: z.string(),
  description: z.string(),
  status: beerStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const judgeBeerSchema = bjcpStyleSnapshotSchema.extend({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  entryNumber: z.number().int().positive(),
  description: z.string(),
  status: beerStatusSchema,
  competitionStatus: competitionStatusSchema,
  canScore: z.boolean(),
});

export const beerListResultSchema = z.object({ beers: z.array(beerSchema) });
export const beerResultSchema = z.object({ beer: beerSchema });
export const judgeBeerResultSchema = z.object({ beer: judgeBeerSchema });

export const beerQrCodeSchema = beerSchema.pick({
  id: true,
  competitionId: true,
  entryNumber: true,
  realName: true,
  producer: true,
  bjcpCategoryCode: true,
  bjcpCategoryName: true,
  bjcpSubcategoryCode: true,
  bjcpSubcategoryName: true,
}).extend({
  judgeUrl: z.string().url(),
});

export const beerQrCodeListResultSchema = z.object({
  beers: z.array(beerQrCodeSchema),
});

export type BeerStatus = z.infer<typeof beerStatusSchema>;
export type CreateBeerInput = z.infer<typeof createBeerInputSchema>;
export type UpdateBeerInput = z.infer<typeof updateBeerInputSchema>;
export type UpdateBeerStatusInput = z.infer<typeof updateBeerStatusInputSchema>;
export type BeerResult = z.infer<typeof beerResultSchema>;
export type BeerListResult = z.infer<typeof beerListResultSchema>;
export type JudgeBeerResult = z.infer<typeof judgeBeerResultSchema>;
export type BeerQrCodeListResult = z.infer<typeof beerQrCodeListResultSchema>;
