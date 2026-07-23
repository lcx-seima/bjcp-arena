import { isProfessionalScoreJudgeType, type MyScoreResult } from "@bjcp-arena/contracts";

export type MyScore = NonNullable<MyScoreResult["score"]>;

export interface ProfessionalValues {
  aroma: number;
  appearance: number;
  flavor: number;
  mouthfeel: number;
  overall: number;
  aromaComment: string;
  appearanceComment: string;
  flavorComment: string;
  mouthfeelComment: string;
  overallComment: string;
}

export interface AmateurValues {
  drinkability: number;
  balance: number;
  flavorAcceptance: number;
  repeatIntention: number;
  comment: string;
}

export interface ScoreDraft {
  amateurValues?: AmateurValues;
  professionalValues?: ProfessionalValues;
  savedAt?: string;
}

export const defaultProfessionalValues: ProfessionalValues = {
  aroma: 0,
  appearance: 0,
  flavor: 0,
  mouthfeel: 0,
  overall: 0,
  aromaComment: "",
  appearanceComment: "",
  flavorComment: "",
  mouthfeelComment: "",
  overallComment: "",
};

export const defaultAmateurValues: AmateurValues = {
  drinkability: 0,
  balance: 0,
  flavorAcceptance: 0,
  repeatIntention: 0,
  comment: "",
};

export function professionalValuesFromScore(score: MyScore): ProfessionalValues {
  return {
    aroma: score.professionalAromaScore ?? 0,
    appearance: score.professionalAppearanceScore ?? 0,
    flavor: score.professionalFlavorScore ?? 0,
    mouthfeel: score.professionalMouthfeelScore ?? 0,
    overall: score.professionalOverallScore ?? 0,
    aromaComment: score.professionalAromaComment ?? "",
    appearanceComment: score.professionalAppearanceComment ?? "",
    flavorComment: score.professionalFlavorComment ?? "",
    mouthfeelComment: score.professionalMouthfeelComment ?? "",
    overallComment: score.professionalOverallComment ?? "",
  };
}

export function amateurValuesFromScore(score: MyScore): AmateurValues {
  return {
    drinkability: score.amateurDrinkabilityScore ?? 0,
    balance: score.amateurBalanceScore ?? 0,
    flavorAcceptance: score.amateurFlavorAcceptanceScore ?? 0,
    repeatIntention: score.amateurRepeatIntentionScore ?? 0,
    comment: score.amateurComment ?? "",
  };
}

export function resolveInitialScoreFormState({
  draft,
  score,
}: {
  draft: ScoreDraft | null;
  score: MyScore | null;
}) {
  if (score) {
    return {
      amateurValues:
        score.judgeTypeSnapshot === "public" ? amateurValuesFromScore(score) : defaultAmateurValues,
      draftSavedAt: null,
      professionalValues:
        isProfessionalScoreJudgeType(score.judgeTypeSnapshot)
          ? professionalValuesFromScore(score)
          : defaultProfessionalValues,
      shouldClearDraft: draft !== null,
      shouldRestoreDraft: false,
    };
  }

  return {
    amateurValues: draft?.amateurValues ?? defaultAmateurValues,
    draftSavedAt: draft?.savedAt ?? null,
    professionalValues: draft?.professionalValues ?? defaultProfessionalValues,
    shouldClearDraft: false,
    shouldRestoreDraft: draft !== null,
  };
}

export function shouldSaveScoreDraft({
  hasUserEdited,
  score,
  status,
}: {
  hasUserEdited: boolean;
  score: MyScore | null;
  status: "loading" | "ready";
}) {
  return status === "ready" && hasUserEdited && score === null;
}

export function scoreValuesHaveZeroDimension(values: AmateurValues | ProfessionalValues) {
  const dimensions =
    "aroma" in values
      ? [values.aroma, values.appearance, values.flavor, values.mouthfeel, values.overall]
      : [values.drinkability, values.balance, values.flavorAcceptance, values.repeatIntention];

  return dimensions.some((value) => value === 0);
}

export function shouldDisableScoreSubmit({
  canScore,
  hasJudgeType,
  hasZeroScoreDimension,
  hasUserEdited,
  score,
}: {
  canScore: boolean;
  hasJudgeType: boolean;
  hasZeroScoreDimension: boolean;
  hasUserEdited: boolean;
  score: MyScore | null;
}) {
  return (
    !canScore ||
    !hasJudgeType ||
    hasZeroScoreDimension ||
    (score !== null && !hasUserEdited)
  );
}

export function shouldDisableScoreDelete({
  canScore,
  isDeleting,
  isSubmitting,
  score,
  status,
}: {
  canScore: boolean;
  isDeleting: boolean;
  isSubmitting: boolean;
  score: MyScore | null;
  status: "loading" | "ready";
}) {
  return status !== "ready" || !canScore || score === null || isSubmitting || isDeleting;
}

export function scoreDraftFromCurrentValues({
  amateurValues,
  professionalValues,
  savedAt,
}: {
  amateurValues: AmateurValues;
  professionalValues: ProfessionalValues;
  savedAt: string;
}): ScoreDraft {
  return { amateurValues, professionalValues, savedAt };
}

export function scoreSubmitButtonText({
  canScore,
  score,
}: {
  canScore: boolean;
  score: MyScore | null;
}) {
  if (!canScore) return "轮次已结束";
  return score ? "更新评分" : "提交评分";
}

export function scoreLeaveConfirmContent(score: MyScore | null) {
  return score
    ? "本次修改不会保存，下次进入会重置到最后一次提交内容。确认退出？"
    : "当前内容已保存为本地草稿，下次进入可继续编辑。确认退出？";
}
