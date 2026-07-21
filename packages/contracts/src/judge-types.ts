import { z } from "zod";

export const judgeTypeProfessional = "professional" as const;
export const judgeTypePublic = "public" as const;
export const judgeTypeConsumer = "consumer" as const;

export const judgeTypes = [
  judgeTypeProfessional,
  judgeTypeConsumer,
  judgeTypePublic,
] as const;
export const judgeTypeLabels: Record<(typeof judgeTypes)[number], string> = {
  [judgeTypeProfessional]: "专业裁判",
  [judgeTypeConsumer]: "消费者裁判",
  [judgeTypePublic]: "大众评委",
};
export const judgeTypeSchema = z.enum(judgeTypes);
export const nullableJudgeTypeSchema = judgeTypeSchema.nullable();

export type JudgeType = z.infer<typeof judgeTypeSchema>;

export function isProfessionalScoreJudgeType(
  judgeType: JudgeType
): judgeType is typeof judgeTypeProfessional | typeof judgeTypeConsumer {
  return judgeType === judgeTypeProfessional || judgeType === judgeTypeConsumer;
}
