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
  aroma: 6,
  appearance: 2,
  flavor: 10,
  mouthfeel: 3,
  overall: 5,
  aromaComment: "",
  appearanceComment: "",
  flavorComment: "",
  mouthfeelComment: "",
  overallComment: "",
};

export const defaultAmateurValues: AmateurValues = {
  drinkability: 3,
  balance: 3,
  flavorAcceptance: 3,
  repeatIntention: 3,
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
    drinkability: score.amateurDrinkabilityScore ?? 3,
    balance: score.amateurBalanceScore ?? 3,
    flavorAcceptance: score.amateurFlavorAcceptanceScore ?? 3,
    repeatIntention: score.amateurRepeatIntentionScore ?? 3,
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

export function shouldDisableScoreSubmit({
  canScore,
  hasJudgeType,
  hasUserEdited,
  score,
}: {
  canScore: boolean;
  hasJudgeType: boolean;
  hasUserEdited: boolean;
  score: MyScore | null;
}) {
  return !canScore || !hasJudgeType || (score !== null && !hasUserEdited);
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
