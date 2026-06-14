import { z } from "zod";

export const bjcpSubcategories = [
  {
    categoryCode: "10",
    categoryName: "German Wheat Beer",
    subcategoryCode: "10A",
    subcategoryName: "Weissbier",
  },
  {
    categoryCode: "21",
    categoryName: "IPA",
    subcategoryCode: "21A",
    subcategoryName: "American IPA",
  },
  {
    categoryCode: "21",
    categoryName: "IPA",
    subcategoryCode: "21B",
    subcategoryName: "Specialty IPA",
  },
] as const;

export const bjcpSubcategoryCodeSchema = z.enum(
  bjcpSubcategories.map((style) => style.subcategoryCode) as [
    (typeof bjcpSubcategories)[number]["subcategoryCode"],
    ...(typeof bjcpSubcategories)[number]["subcategoryCode"][],
  ]
);

export const bjcpStyleSnapshotSchema = z.object({
  bjcpCategoryCode: z.string().min(1),
  bjcpCategoryName: z.string().min(1),
  bjcpSubcategoryCode: z.string().min(1),
  bjcpSubcategoryName: z.string().min(1),
});

export function findBjcpSubcategory(code: string) {
  return bjcpSubcategories.find((style) => style.subcategoryCode === code) ?? null;
}
