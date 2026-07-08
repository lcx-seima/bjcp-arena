import { describe, expect, it } from "vitest";
import type { MyScoreResult } from "@bjcp-arena/contracts";
import {
  defaultAmateurValues,
  defaultProfessionalValues,
  resolveInitialScoreFormState,
  scoreDraftFromCurrentValues,
  scoreLeaveConfirmContent,
  scoreSubmitButtonText,
  shouldDisableScoreDelete,
  shouldSaveScoreDraft,
  shouldDisableScoreSubmit,
} from "./score-draft.js";

type MyScore = NonNullable<MyScoreResult["score"]>;

const submittedProfessionalScore: MyScore = {
  id: 1,
  competitionId: 1,
  roundId: 2,
  beerId: 3,
  judgeUserId: 4,
  judgeTypeSnapshot: "professional",
  judgeNicknameSnapshot: "Judge",
  professionalAromaScore: 9,
  professionalAromaComment: "麦芽香气清晰",
  professionalAppearanceScore: 3,
  professionalAppearanceComment: "泡沫细腻",
  professionalFlavorScore: 16,
  professionalFlavorComment: "层次完整",
  professionalMouthfeelScore: 4,
  professionalMouthfeelComment: "酒体顺滑",
  professionalOverallScore: 8,
  professionalOverallComment: "整体表现稳定",
  professionalTotalScore: 40,
  professionalGrade: "Excellent",
  amateurDrinkabilityScore: null,
  amateurBalanceScore: null,
  amateurFlavorAcceptanceScore: null,
  amateurRepeatIntentionScore: null,
  amateurTotalScore: null,
  amateurComment: null,
  submittedAt: "2026-07-07T10:00:00.000Z",
  updatedAt: "2026-07-07T10:00:00.000Z",
};

describe("score draft policy", () => {
  it("已提交过评分时使用 DB 内容并要求清理本地草稿", () => {
    const state = resolveInitialScoreFormState({
      draft: {
        professionalValues: {
          aroma: 1,
          appearance: 1,
          flavor: 1,
          mouthfeel: 1,
          overall: 1,
          aromaComment: "旧草稿",
          appearanceComment: "旧草稿",
          flavorComment: "旧草稿",
          mouthfeelComment: "旧草稿",
          overallComment: "旧草稿",
        },
        savedAt: "2026-07-07T09:00:00.000Z",
      },
      score: submittedProfessionalScore,
    });

    expect(state.professionalValues).toEqual({
      aroma: 9,
      appearance: 3,
      flavor: 16,
      mouthfeel: 4,
      overall: 8,
      aromaComment: "麦芽香气清晰",
      appearanceComment: "泡沫细腻",
      flavorComment: "层次完整",
      mouthfeelComment: "酒体顺滑",
      overallComment: "整体表现稳定",
    });
    expect(state.amateurValues).toEqual(defaultAmateurValues);
    expect(state.draftSavedAt).toBeNull();
    expect(state.shouldRestoreDraft).toBe(false);
    expect(state.shouldClearDraft).toBe(true);
  });

  it("未提交过评分且有草稿时恢复草稿", () => {
    const state = resolveInitialScoreFormState({
      draft: {
        amateurValues: {
          drinkability: 5,
          balance: 4,
          flavorAcceptance: 4,
          repeatIntention: 5,
          comment: "本地记录",
        },
        savedAt: "2026-07-07T09:00:00.000Z",
      },
      score: null,
    });

    expect(state.professionalValues).toEqual(defaultProfessionalValues);
    expect(state.amateurValues).toEqual({
      drinkability: 5,
      balance: 4,
      flavorAcceptance: 4,
      repeatIntention: 5,
      comment: "本地记录",
    });
    expect(state.draftSavedAt).toBe("2026-07-07T09:00:00.000Z");
    expect(state.shouldRestoreDraft).toBe(true);
    expect(state.shouldClearDraft).toBe(false);
  });

  it("仅未提交过评分且已修改时保存草稿", () => {
    expect(shouldSaveScoreDraft({ hasUserEdited: true, score: null, status: "ready" })).toBe(true);
    expect(
      shouldSaveScoreDraft({ hasUserEdited: true, score: submittedProfessionalScore, status: "ready" })
    ).toBe(false);
    expect(shouldSaveScoreDraft({ hasUserEdited: false, score: null, status: "ready" })).toBe(false);
    expect(shouldSaveScoreDraft({ hasUserEdited: true, score: null, status: "loading" })).toBe(false);
  });

  it("退出确认文案按是否已提交评分区分", () => {
    expect(scoreLeaveConfirmContent(null)).toBe(
      "当前内容已保存为本地草稿，下次进入可继续编辑。确认退出？"
    );
    expect(scoreLeaveConfirmContent(submittedProfessionalScore)).toBe(
      "本次修改不会保存，下次进入会重置到最后一次提交内容。确认退出？"
    );
  });

  it("已提交评分且用户未修改时禁用更新按钮", () => {
    expect(
      shouldDisableScoreSubmit({
        canScore: true,
        hasUserEdited: false,
        hasJudgeType: true,
        score: submittedProfessionalScore,
      })
    ).toBe(true);
    expect(
      shouldDisableScoreSubmit({
        canScore: true,
        hasUserEdited: true,
        hasJudgeType: true,
        score: submittedProfessionalScore,
      })
    ).toBe(false);
    expect(
      shouldDisableScoreSubmit({
        canScore: true,
        hasUserEdited: false,
        hasJudgeType: true,
        score: null,
      })
    ).toBe(false);
  });

  it("轮次不可评分时提交按钮文案显示轮次已结束", () => {
    expect(scoreSubmitButtonText({ canScore: false, score: null })).toBe("轮次已结束");
    expect(scoreSubmitButtonText({ canScore: false, score: submittedProfessionalScore })).toBe(
      "轮次已结束"
    );
    expect(scoreSubmitButtonText({ canScore: true, score: null })).toBe("提交评分");
    expect(scoreSubmitButtonText({ canScore: true, score: submittedProfessionalScore })).toBe(
      "更新评分"
    );
  });

  it("删除评分前把当前表单内容保存为草稿", () => {
    const savedAt = "2026-07-07T11:00:00.000Z";
    const draft = scoreDraftFromCurrentValues({
      amateurValues: {
        drinkability: 5,
        balance: 4,
        flavorAcceptance: 3,
        repeatIntention: 2,
        comment: "删除前当前大众表单",
      },
      professionalValues: {
        aroma: 8,
        appearance: 2,
        flavor: 15,
        mouthfeel: 4,
        overall: 7,
        aromaComment: "删除前香气",
        appearanceComment: "删除前外观",
        flavorComment: "删除前风味",
        mouthfeelComment: "删除前口感",
        overallComment: "删除前整体",
      },
      savedAt,
    });

    expect(draft).toEqual({
      amateurValues: {
        drinkability: 5,
        balance: 4,
        flavorAcceptance: 3,
        repeatIntention: 2,
        comment: "删除前当前大众表单",
      },
      professionalValues: {
        aroma: 8,
        appearance: 2,
        flavor: 15,
        mouthfeel: 4,
        overall: 7,
        aromaComment: "删除前香气",
        appearanceComment: "删除前外观",
        flavorComment: "删除前风味",
        mouthfeelComment: "删除前口感",
        overallComment: "删除前整体",
      },
      savedAt,
    });
  });

  it("仅已有评分且页面可评分时允许删除", () => {
    expect(
      shouldDisableScoreDelete({
        canScore: true,
        isDeleting: false,
        isSubmitting: false,
        score: submittedProfessionalScore,
        status: "ready",
      })
    ).toBe(false);
    expect(
      shouldDisableScoreDelete({
        canScore: true,
        isDeleting: false,
        isSubmitting: false,
        score: null,
        status: "ready",
      })
    ).toBe(true);
    expect(
      shouldDisableScoreDelete({
        canScore: false,
        isDeleting: false,
        isSubmitting: false,
        score: submittedProfessionalScore,
        status: "ready",
      })
    ).toBe(true);
    expect(
      shouldDisableScoreDelete({
        canScore: true,
        isDeleting: true,
        isSubmitting: false,
        score: submittedProfessionalScore,
        status: "ready",
      })
    ).toBe(true);
  });
});
