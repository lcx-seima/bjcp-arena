import { Button, Dialog, Slider, Tag, TextArea, Toast } from "antd-mobile";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  JudgeBeerResult,
  ScoreInput,
  UserPublic,
} from "@bjcp-arena/contracts";
import { judgeTypeLabels, professionalScoreGrade, scoreInputSchema } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { isUnauthorized, readError } from "../../utils/errors.js";
import {
  defaultAmateurValues,
  defaultProfessionalValues,
  resolveInitialScoreFormState,
  scoreLeaveConfirmContent,
  scoreSubmitButtonText,
  shouldDisableScoreSubmit,
  shouldSaveScoreDraft,
  type AmateurValues,
  type MyScore,
  type ProfessionalValues,
  type ScoreDraft,
} from "./score-draft.js";
import classes from "./ScorePage.module.css";

type JudgeBeer = JudgeBeerResult["beer"];
type ScoreSliderValue = number | [number, number];

const scoreFieldLabels = {
  amateurBalanceScore: "平衡感",
  amateurComment: "总反馈",
  amateurDrinkabilityScore: "易饮性",
  amateurFlavorAcceptanceScore: "风味接受度",
  amateurRepeatIntentionScore: "复饮意愿",
  professionalAppearanceComment: "Appearance 外观反馈",
  professionalAppearanceScore: "Appearance 外观分数",
  professionalAromaComment: "Aroma 香气反馈",
  professionalAromaScore: "Aroma 香气分数",
  professionalFlavorComment: "Flavor 风味反馈",
  professionalFlavorScore: "Flavor 风味分数",
  professionalMouthfeelComment: "Mouthfeel 口感反馈",
  professionalMouthfeelScore: "Mouthfeel 口感分数",
  professionalOverallComment: "Overall Impression 整体印象反馈",
  professionalOverallScore: "Overall Impression 整体印象分数",
} as const;

type ScoreField = keyof typeof scoreFieldLabels;
type ValidationErrors = Partial<Record<ScoreField, string>>;

function toSingleScore(value: ScoreSliderValue) {
  return typeof value === "number" ? value : value[1];
}

function formatLocalDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function isScoreField(value: unknown): value is ScoreField {
  return typeof value === "string" && value in scoreFieldLabels;
}

function validationMessage(field: ScoreField, issueCode: string) {
  const label = scoreFieldLabels[field];
  if (field.endsWith("Comment")) {
    if (issueCode === "too_big") return `${label}不能超过 2000 字`;
    return `请填写${label}`;
  }
  return `请调整${label}`;
}

function validateScoreInput(input: ScoreInput) {
  const result = scoreInputSchema.safeParse(input);
  if (result.success) return { errors: {}, firstField: null as ScoreField | null };

  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const field = isScoreField(issue.path[0]) ? issue.path[0] : null;
    if (!field || errors[field]) continue;
    errors[field] = validationMessage(field, issue.code);
  }

  const firstField = Object.keys(errors)[0] as ScoreField | undefined;
  return { errors, firstField: firstField ?? null };
}

function scrollToScoreField(field: ScoreField) {
  window.requestAnimationFrame(() => {
    const fieldElement = document.querySelector<HTMLElement>(`[data-score-field="${field}"]`);
    fieldElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    fieldElement?.querySelector<HTMLElement>("textarea, input, button")?.focus();
  });
}

export function ScorePage({
  beerId,
  competitionId,
  onLogout,
  roundId,
  user,
}: {
  beerId: number;
  competitionId: number;
  roundId: number;
  onLogout: () => void;
  user: UserPublic;
}) {
  const draftKey = `bjcp-score-draft:${user.id}:${competitionId}:${roundId}:${beerId}`;
  const roundHref = `/competitions/${competitionId}/rounds/${roundId}`;
  const shouldSkipLeaveWarningRef = useRef(false);
  const [beer, setBeer] = useState<JudgeBeer | null>(null);
  const [score, setScore] = useState<MyScore | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [professionalValues, setProfessionalValues] =
    useState<ProfessionalValues>(defaultProfessionalValues);
  const [amateurValues, setAmateurValues] = useState<AmateurValues>(defaultAmateurValues);

  const professionalTotal = useMemo(
    () =>
      professionalValues.aroma +
      professionalValues.appearance +
      professionalValues.flavor +
      professionalValues.mouthfeel +
      professionalValues.overall,
    [professionalValues]
  );

  const amateurTotal = useMemo(
    () =>
      amateurValues.drinkability +
      amateurValues.balance +
      amateurValues.flavorAcceptance +
      amateurValues.repeatIntention,
    [amateurValues]
  );
  const effectiveJudgeType = score?.judgeTypeSnapshot ?? user.judgeType;
  const judgeIdentityText = effectiveJudgeType
    ? `裁判身份：${judgeTypeLabels[effectiveJudgeType]}`
    : "裁判身份未设置";
  const actionTimeText = draftSavedAt
    ? `草稿已保存：${formatLocalDateTime(draftSavedAt)}`
    : score
      ? `上次提交：${formatLocalDateTime(score.submittedAt)}`
      : "草稿将在修改后自动保存";
  const totalSummary =
    effectiveJudgeType === "professional"
      ? `总分 ${professionalTotal}/50 · ${professionalScoreGrade(professionalTotal)}`
      : effectiveJudgeType === "public"
        ? `总分 ${amateurTotal}/20`
        : "总分暂不可用";

  const clearValidationError = useCallback((field: ScoreField) => {
    setValidationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);
  const handleProfessionalChange = useCallback((values: ProfessionalValues) => {
    setHasUserEdited(true);
    setProfessionalValues(values);
  }, []);
  const handleAmateurChange = useCallback((values: AmateurValues) => {
    setHasUserEdited(true);
    setAmateurValues(values);
  }, []);

  const refresh = useCallback(async () => {
    const [beerResult, scoreResult] = await Promise.all([
      client.getJudgeBeer(competitionId, roundId, beerId),
      client.getMyScore(competitionId, roundId, beerId),
    ]);
    setBeer(beerResult.beer);
    setScore(scoreResult.score);
    setHasUserEdited(false);

    const draftText = localStorage.getItem(draftKey);
    const draft = draftText ? (JSON.parse(draftText) as ScoreDraft) : null;
    const initialState = resolveInitialScoreFormState({ draft, score: scoreResult.score });
    setProfessionalValues(initialState.professionalValues);
    setAmateurValues(initialState.amateurValues);
    setDraftSavedAt(initialState.draftSavedAt);
    if (initialState.shouldClearDraft) {
      localStorage.removeItem(draftKey);
    }
    if (initialState.shouldRestoreDraft) {
      await Dialog.alert({
        content: initialState.draftSavedAt
          ? `已恢复 ${formatLocalDateTime(initialState.draftSavedAt)} 保存的本地草稿。确认后继续编辑。`
          : "已恢复本地草稿。确认后继续编辑。",
        title: "已恢复本地草稿",
      });
    }
    setStatus("ready");
  }, [beerId, competitionId, draftKey, roundId]);

  useEffect(() => {
    void refresh().catch((unknownError) => {
      setStatus("ready");
      if (isUnauthorized(unknownError)) {
        onLogout();
        return;
      }
      setError(readError(unknownError));
    });
  }, [onLogout, refresh]);

  useEffect(() => {
    if (!shouldSaveScoreDraft({ hasUserEdited, score, status })) return;
    const savedAt = new Date().toISOString();
    localStorage.setItem(
      draftKey,
      JSON.stringify({ amateurValues, professionalValues, savedAt } satisfies ScoreDraft)
    );
    setDraftSavedAt(savedAt);
  }, [amateurValues, draftKey, hasUserEdited, professionalValues, score, status]);

  useEffect(() => {
    if (!hasUserEdited) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldSkipLeaveWarningRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUserEdited]);

  async function handleLeavePage() {
    if (hasUserEdited) {
      const confirmed = await Dialog.confirm({
        content: scoreLeaveConfirmContent(score),
        title: "退出评分？",
      });
      if (!confirmed) return;
    }

    shouldSkipLeaveWarningRef.current = true;
    window.location.href = roundHref;
  }

  async function handleSubmit() {
    if (!effectiveJudgeType || !beer) {
      const message = "当前账号未预设裁判类型，无法提交评分。";
      setError(message);
      Toast.show({ content: message, icon: "fail" });
      return;
    }

    const payload: ScoreInput =
      effectiveJudgeType === "professional"
        ? {
            judgeType: "professional",
            professionalAromaScore: professionalValues.aroma,
            professionalAromaComment: professionalValues.aromaComment,
            professionalAppearanceScore: professionalValues.appearance,
            professionalAppearanceComment: professionalValues.appearanceComment,
            professionalFlavorScore: professionalValues.flavor,
            professionalFlavorComment: professionalValues.flavorComment,
            professionalMouthfeelScore: professionalValues.mouthfeel,
            professionalMouthfeelComment: professionalValues.mouthfeelComment,
            professionalOverallScore: professionalValues.overall,
            professionalOverallComment: professionalValues.overallComment,
          }
        : {
            judgeType: "public",
            amateurDrinkabilityScore: amateurValues.drinkability,
            amateurBalanceScore: amateurValues.balance,
            amateurFlavorAcceptanceScore: amateurValues.flavorAcceptance,
            amateurRepeatIntentionScore: amateurValues.repeatIntention,
            amateurComment: amateurValues.comment,
          };
    const validation = validateScoreInput(payload);
    setValidationErrors(validation.errors);
    if (validation.firstField) {
      scrollToScoreField(validation.firstField);
      Toast.show({ content: validation.errors[validation.firstField], icon: "fail" });
      return;
    }

    const confirmed = await Dialog.confirm({
      content: score ? "确认更新本次评分？" : "确认提交本次评分？",
      title: score ? "更新评分" : "提交评分",
    });
    if (!confirmed) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await client.submitMyScore(competitionId, roundId, beer.id, payload);
      setScore(result.score);
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
      setHasUserEdited(false);
      Toast.show({ content: "评分已提交", icon: "success" });
      shouldSkipLeaveWarningRef.current = true;
      window.location.href = roundHref;
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onLogout();
        return;
      }
      const message = readError(unknownError);
      Toast.show({ content: message, icon: "fail" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MobileShell
      back={{
        label: "返回轮次",
        onClick: () => {
          void handleLeavePage();
        },
      }}
      bottomAction={
        <div className={classes.bottomPanel}>
          <div className={classes.bottomSummary}>
            <strong>{totalSummary}</strong>
            <span>{actionTimeText}</span>
          </div>
          <Button
            block
            color="primary"
            disabled={shouldDisableScoreSubmit({
              canScore: beer?.canScore ?? false,
              hasJudgeType: Boolean(effectiveJudgeType),
              hasUserEdited,
              score,
            })}
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            {scoreSubmitButtonText({ canScore: beer?.canScore ?? false, score })}
          </Button>
        </div>
      }
      rightAction={beer ? <Tag color="primary">#{beer.entryNumber}</Tag> : null}
      title={beer ? `评鉴 ${beer.entryCode}` : "评分"}
    >
      {beer ? (
        <section className={classes.scoreSection}>
          <div className={classes.sectionTitle}>基础信息</div>
          <div className="stack-xs">
            <table className="info-table">
              <tbody>
                <tr>
                  <th>比赛序号</th>
                  <td>#{beer.entryNumber}</td>
                </tr>
                <tr>
                  <th>参赛编号</th>
                  <td>{beer.entryCode}</td>
                </tr>
                <tr>
                  <th>BJCP分类</th>
                  <td>
                    {beer.bjcpSubcategoryCode} {beer.bjcpSubcategoryName}
                  </td>
                </tr>
                <tr>
                  <th>介绍</th>
                  <td style={{ whiteSpace: "pre-wrap" }}>{beer.description}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {error ? <InlineError>{error}</InlineError> : null}

      {effectiveJudgeType === "professional" ? (
        <section className={classes.scoreSection}>
          <div className={classes.sectionTitle}>评价表单</div>
          <div className={classes.judgeIdentity}>{judgeIdentityText}</div>
          <ProfessionalForm
            disabled={!beer?.canScore || status === "loading"}
            errors={validationErrors}
            values={professionalValues}
            onChange={handleProfessionalChange}
            onFieldChange={clearValidationError}
          />
        </section>
      ) : effectiveJudgeType === "public" ? (
        <section className={classes.scoreSection}>
          <div className={classes.sectionTitle}>评价表单</div>
          <div className={classes.judgeIdentity}>{judgeIdentityText}</div>
          <AmateurForm
            disabled={!beer?.canScore || status === "loading"}
            errors={validationErrors}
            values={amateurValues}
            onChange={handleAmateurChange}
            onFieldChange={clearValidationError}
          />
        </section>
      ) : (
        <InlineError>当前账号没有预设裁判类型，请联系管理员。</InlineError>
      )}
    </MobileShell>
  );
}

function ProfessionalForm({
  disabled,
  errors,
  onChange,
  onFieldChange,
  values,
}: {
  disabled: boolean;
  errors: ValidationErrors;
  onChange: (values: ProfessionalValues) => void;
  onFieldChange: (field: ScoreField) => void;
  values: ProfessionalValues;
}) {
  return (
    <div className="stack-md">
      <ScoreDimension
        comment={values.aromaComment}
        commentField="professionalAromaComment"
        disabled={disabled}
        error={errors.professionalAromaComment}
        label="Aroma 香气"
        max={12}
        placeholder="请描述麦芽香、酒花香、酯香、酚类、酒精感、氧化味、DMS、双乙酰等香气表现，并说明强弱和是否符合风格。"
        score={values.aroma}
        onComment={(aromaComment) => {
          onFieldChange("professionalAromaComment");
          onChange({ ...values, aromaComment });
        }}
        onScore={(aroma) => {
          onFieldChange("professionalAromaScore");
          onChange({ ...values, aroma });
        }}
      />
      <ScoreDimension
        comment={values.appearanceComment}
        commentField="professionalAppearanceComment"
        disabled={disabled}
        error={errors.professionalAppearanceComment}
        label="Appearance 外观"
        max={3}
        placeholder="请描述颜色、清澈度、泡沫颜色、泡沫细腻度、泡持、挂杯等视觉表现。"
        score={values.appearance}
        onComment={(appearanceComment) => {
          onFieldChange("professionalAppearanceComment");
          onChange({ ...values, appearanceComment });
        }}
        onScore={(appearance) => {
          onFieldChange("professionalAppearanceScore");
          onChange({ ...values, appearance });
        }}
      />
      <ScoreDimension
        comment={values.flavorComment}
        commentField="professionalFlavorComment"
        disabled={disabled}
        error={errors.professionalFlavorComment}
        label="Flavor 风味"
        max={20}
        placeholder="请描述入口、中段、收口、麦芽表现、酒花风味、苦度、甜度、酸度、发酵特征、余味、平衡感和明显缺陷。"
        score={values.flavor}
        onComment={(flavorComment) => {
          onFieldChange("professionalFlavorComment");
          onChange({ ...values, flavorComment });
        }}
        onScore={(flavor) => {
          onFieldChange("professionalFlavorScore");
          onChange({ ...values, flavor });
        }}
      />
      <ScoreDimension
        comment={values.mouthfeelComment}
        commentField="professionalMouthfeelComment"
        disabled={disabled}
        error={errors.professionalMouthfeelComment}
        label="Mouthfeel 口感"
        max={5}
        placeholder="请描述酒体、杀口感、顺滑度、酒精温热感、涩感、黏腻感、干爽度等口感表现。"
        score={values.mouthfeel}
        onComment={(mouthfeelComment) => {
          onFieldChange("professionalMouthfeelComment");
          onChange({ ...values, mouthfeelComment });
        }}
        onScore={(mouthfeel) => {
          onFieldChange("professionalMouthfeelScore");
          onChange({ ...values, mouthfeel });
        }}
      />
      <ScoreDimension
        comment={values.overallComment}
        commentField="professionalOverallComment"
        disabled={disabled}
        error={errors.professionalOverallComment}
        label="Overall Impression 整体印象"
        max={10}
        placeholder="请总结整体完成度、风格准确度、饮用愉悦度、主要优缺点和改进建议。"
        score={values.overall}
        onComment={(overallComment) => {
          onFieldChange("professionalOverallComment");
          onChange({ ...values, overallComment });
        }}
        onScore={(overall) => {
          onFieldChange("professionalOverallScore");
          onChange({ ...values, overall });
        }}
      />
    </div>
  );
}

function ScoreDimension({
  comment,
  commentField,
  disabled,
  error,
  label,
  max,
  onComment,
  onScore,
  placeholder,
  score,
}: {
  comment: string;
  commentField: ScoreField;
  disabled: boolean;
  error: string | undefined;
  label: string;
  max: number;
  onComment: (value: string) => void;
  onScore: (value: number) => void;
  placeholder: string;
  score: number;
}) {
  return (
    <div
      className={["score-dimension", error ? classes.invalidField : ""].filter(Boolean).join(" ")}
      data-score-field={commentField}
    >
      <div className="score-dimension__header">
        <strong>{label}</strong>
        <span className="score-dimension__value">
          {score}/{max}
        </span>
      </div>
      <Slider
        disabled={disabled}
        max={max}
        min={0}
        popover
        step={1}
        value={score}
        onChange={(value) => onScore(toSingleScore(value))}
      />
      <div className={classes.commentFieldTitle}>评语</div>
      <TextArea
        autoSize={{ minRows: 3 }}
        className={classes.commentTextArea}
        disabled={disabled}
        placeholder={placeholder}
        value={comment}
        onChange={onComment}
      />
      {error ? <div className={classes.fieldError}>{error}</div> : null}
    </div>
  );
}

function AmateurForm({
  disabled,
  errors,
  onChange,
  onFieldChange,
  values,
}: {
  disabled: boolean;
  errors: ValidationErrors;
  onChange: (values: AmateurValues) => void;
  onFieldChange: (field: ScoreField) => void;
  values: AmateurValues;
}) {
  return (
    <div className="stack-md">
      <div className={classes.metricGrid!}>
        <AmateurMetric
          disabled={disabled}
          field="amateurDrinkabilityScore"
          label="易饮性"
          value={values.drinkability}
          onChange={(drinkability) => {
            onFieldChange("amateurDrinkabilityScore");
            onChange({ ...values, drinkability });
          }}
        />
        <AmateurMetric
          disabled={disabled}
          field="amateurBalanceScore"
          label="平衡感"
          value={values.balance}
          onChange={(balance) => {
            onFieldChange("amateurBalanceScore");
            onChange({ ...values, balance });
          }}
        />
        <AmateurMetric
          disabled={disabled}
          field="amateurFlavorAcceptanceScore"
          label="风味接受度"
          value={values.flavorAcceptance}
          onChange={(flavorAcceptance) => {
            onFieldChange("amateurFlavorAcceptanceScore");
            onChange({ ...values, flavorAcceptance });
          }}
        />
        <AmateurMetric
          disabled={disabled}
          field="amateurRepeatIntentionScore"
          label="复饮意愿"
          value={values.repeatIntention}
          onChange={(repeatIntention) => {
            onFieldChange("amateurRepeatIntentionScore");
            onChange({ ...values, repeatIntention });
          }}
        />
      </div>
      <div
        className={[
          "score-dimension",
          errors.amateurComment ? classes.invalidField : "",
        ].filter(Boolean).join(" ")}
        data-score-field="amateurComment"
      >
        <strong>总反馈</strong>
        <TextArea
          autoSize={{ minRows: 4 }}
          disabled={disabled}
          placeholder="请填写整体饮用感受、喜好原因和改进建议。"
          value={values.comment}
          onChange={(comment) => {
            onFieldChange("amateurComment");
            onChange({ ...values, comment });
          }}
        />
        {errors.amateurComment ? (
          <div className={classes.fieldError}>{errors.amateurComment}</div>
        ) : null}
      </div>
    </div>
  );
}

function AmateurMetric({
  disabled,
  field,
  label,
  value,
  onChange,
}: {
  disabled: boolean;
  field: ScoreField;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="metric-control" data-score-field={field}>
      <div className="metric-control__header">
        <strong>{label}</strong>
        <span className="score-dimension__value">{value}/5</span>
      </div>
      <Slider
        disabled={disabled}
        max={5}
        min={1}
        popover
        step={1}
        value={value}
        onChange={(next) => onChange(toSingleScore(next))}
      />
    </div>
  );
}
