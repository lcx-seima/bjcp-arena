import { z } from "zod";
import { bjcpStyleSnapshotSchema, bjcpSubcategoryCodeSchema } from "./bjcp-styles.js";

export function normalizeEntryCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}\d{4}$/.test(normalized)) {
    throw new Error("Entry code must use two uppercase letters followed by four digits");
  }
  return normalized;
}

export const entryCodeSchema = z.string().transform((value, context) => {
  try {
    return normalizeEntryCode(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid entry code",
    });
    return z.NEVER;
  }
});

export function beerListPath(competitionId: number) {
  return `/api/competitions/${competitionId}/beers` as const;
}

export function beerByIdPath(competitionId: number, beerId: number) {
  return `/api/competitions/${competitionId}/beers/${beerId}` as const;
}

export function beerImportPath(competitionId: number) {
  return `/api/competitions/${competitionId}/beers/import` as const;
}

const categoryRemarkSchema = z.string().trim().max(500);
const categoryRemarkResultSchema = z.string().default("");

export const createBeerInputSchema = z.object({
  entryCode: entryCodeSchema,
  bjcpSubcategoryCode: bjcpSubcategoryCodeSchema,
  categoryRemark: categoryRemarkSchema.default(""),
  description: z.string().trim().min(1).max(5000),
  name: z.string().trim().min(1).max(160),
  brewery: z.string().trim().min(1).max(160),
});

export const updateBeerInputSchema = z
  .object({
    bjcpSubcategoryCode: bjcpSubcategoryCodeSchema.optional(),
    categoryRemark: categoryRemarkSchema.optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    name: z.string().trim().min(1).max(160).optional(),
    brewery: z.string().trim().min(1).max(160).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const importBeerRowSchema = createBeerInputSchema.omit({ entryCode: true }).extend({
  rowNumber: z.number().int().min(2),
  entryCode: z.string().trim().min(1),
});

export const importBeersInputSchema = z.object({
  beers: z.array(importBeerRowSchema).min(1).max(1000),
});

export const beerSchema = bjcpStyleSnapshotSchema.extend({
  id: z.number().int().positive(),
  competitionId: z.number().int().positive(),
  entryCode: entryCodeSchema,
  entryNumber: z.number().int().positive(),
  categoryRemark: categoryRemarkResultSchema,
  description: z.string(),
  name: z.string(),
  brewery: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const beerListResultSchema = z.object({ beers: z.array(beerSchema) });
export const beerResultSchema = z.object({ beer: beerSchema });

export const importBeersResultSchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  beers: z.array(beerSchema),
});

export type CreateBeerInput = z.infer<typeof createBeerInputSchema>;
export type UpdateBeerInput = z.infer<typeof updateBeerInputSchema>;
export type ImportBeerRow = z.infer<typeof importBeerRowSchema>;
export type ImportBeersInput = z.infer<typeof importBeersInputSchema>;
export type BeerResult = z.infer<typeof beerResultSchema>;
export type BeerListResult = z.infer<typeof beerListResultSchema>;
export type ImportBeersResult = z.infer<typeof importBeersResultSchema>;
