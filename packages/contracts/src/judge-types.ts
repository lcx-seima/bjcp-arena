import { z } from "zod";

export const judgeTypeProfessional = "professional" as const;
export const judgeTypePublic = "public" as const;

export const judgeTypes = [judgeTypeProfessional, judgeTypePublic] as const;
export const judgeTypeLabels: Record<(typeof judgeTypes)[number], string> = {
  [judgeTypeProfessional]: "专业裁判",
  [judgeTypePublic]: "消费者裁判",
};
export const judgeTypeSchema = z.enum(judgeTypes);
export const nullableJudgeTypeSchema = judgeTypeSchema.nullable();

export type JudgeType = z.infer<typeof judgeTypeSchema>;
