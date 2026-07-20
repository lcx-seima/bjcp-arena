import { z } from "zod";

export const judgeTypeProfessional = "professional" as const;
export const judgeTypePublic = "public" as const;
export const judgeTypeSeniorEnthusiast = "senior_enthusiast" as const;

export const judgeTypes = [
  judgeTypeProfessional,
  judgeTypeSeniorEnthusiast,
  judgeTypePublic,
] as const;
export const judgeTypeLabels: Record<(typeof judgeTypes)[number], string> = {
  [judgeTypeProfessional]: "专业裁判",
  [judgeTypeSeniorEnthusiast]: "资深爱好者裁判",
  [judgeTypePublic]: "消费者裁判",
};
export const judgeTypeSchema = z.enum(judgeTypes);
export const nullableJudgeTypeSchema = judgeTypeSchema.nullable();

export type JudgeType = z.infer<typeof judgeTypeSchema>;

export function isProfessionalScoreJudgeType(
  judgeType: JudgeType
): judgeType is typeof judgeTypeProfessional | typeof judgeTypeSeniorEnthusiast {
  return judgeType === judgeTypeProfessional || judgeType === judgeTypeSeniorEnthusiast;
}
