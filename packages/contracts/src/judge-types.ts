import { z } from "zod";

export const judgeTypeProfessional = "professional" as const;
export const judgeTypePublic = "public" as const;

export const judgeTypes = [judgeTypeProfessional, judgeTypePublic] as const;
export const judgeTypeSchema = z.enum(judgeTypes);
export const nullableJudgeTypeSchema = judgeTypeSchema.nullable();

export type JudgeType = z.infer<typeof judgeTypeSchema>;
