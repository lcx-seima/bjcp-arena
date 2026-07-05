import {
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
} from "@mantine/core";
import { ArrowLeft, LogOut, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JudgeBeerResult, JudgeType, MyScoreResult, UserPublic } from "@bjcp-arena/contracts";
import { professionalScoreGrade } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";
import classes from "./ScorePage.module.css";

type JudgeBeer = JudgeBeerResult["beer"];
type MyScore = NonNullable<MyScoreResult["score"]>;

interface ProfessionalValues {
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

interface AmateurValues {
  drinkability: number;
  balance: number;
  flavorAcceptance: number;
  repeatIntention: number;
  comment: string;
}

const defaultProfessional: ProfessionalValues = {
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

const defaultAmateur: AmateurValues = {
  drinkability: 3,
  balance: 3,
  flavorAcceptance: 3,
  repeatIntention: 3,
  comment: "",
};

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value || 0);
}

function judgeTypeFormLabel(judgeType: JudgeType | null) {
  if (judgeType === "professional") return "专业裁判表单";
  if (judgeType === "public") return "爱好者裁判表单";
  return "未设置裁判类型";
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
  const [beer, setBeer] = useState<JudgeBeer | null>(null);
  const [score, setScore] = useState<MyScore | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [professionalValues, setProfessionalValues] =
    useState<ProfessionalValues>(defaultProfessional);
  const [amateurValues, setAmateurValues] = useState<AmateurValues>(defaultAmateur);

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

  const refresh = useCallback(async () => {
    const [beerResult, scoreResult] = await Promise.all([
      client.getJudgeBeer(competitionId, roundId, beerId),
      client.getMyScore(competitionId, roundId, beerId),
    ]);
    setBeer(beerResult.beer);
    setScore(scoreResult.score);
    if (scoreResult.score?.judgeTypeSnapshot === "professional") {
      setProfessionalValues({
        aroma: scoreResult.score.professionalAromaScore ?? 0,
        appearance: scoreResult.score.professionalAppearanceScore ?? 0,
        flavor: scoreResult.score.professionalFlavorScore ?? 0,
        mouthfeel: scoreResult.score.professionalMouthfeelScore ?? 0,
        overall: scoreResult.score.professionalOverallScore ?? 0,
        aromaComment: scoreResult.score.professionalAromaComment ?? "",
        appearanceComment: scoreResult.score.professionalAppearanceComment ?? "",
        flavorComment: scoreResult.score.professionalFlavorComment ?? "",
        mouthfeelComment: scoreResult.score.professionalMouthfeelComment ?? "",
        overallComment: scoreResult.score.professionalOverallComment ?? "",
      });
    } else if (scoreResult.score?.judgeTypeSnapshot === "public") {
      setAmateurValues({
        drinkability: scoreResult.score.amateurDrinkabilityScore ?? 3,
        balance: scoreResult.score.amateurBalanceScore ?? 3,
        flavorAcceptance: scoreResult.score.amateurFlavorAcceptanceScore ?? 3,
        repeatIntention: scoreResult.score.amateurRepeatIntentionScore ?? 3,
        comment: scoreResult.score.amateurComment ?? "",
      });
    } else {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsed = JSON.parse(draft) as {
          professionalValues?: ProfessionalValues;
          amateurValues?: AmateurValues;
        };
        if (parsed.professionalValues) setProfessionalValues(parsed.professionalValues);
        if (parsed.amateurValues) setAmateurValues(parsed.amateurValues);
        setDraftNotice("已恢复本地草稿，请记得提交。");
      }
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
    if (status !== "ready" || score) return;
    localStorage.setItem(draftKey, JSON.stringify({ professionalValues, amateurValues }));
  }, [amateurValues, draftKey, professionalValues, score, status]);

  async function handleSubmit() {
    if (!effectiveJudgeType || !beer) {
      setError("当前账号未预设裁判类型，无法提交评分。");
      return;
    }
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const payload =
        effectiveJudgeType === "professional"
          ? {
              judgeType: "professional" as const,
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
              judgeType: "public" as const,
              amateurDrinkabilityScore: amateurValues.drinkability,
              amateurBalanceScore: amateurValues.balance,
              amateurFlavorAcceptanceScore: amateurValues.flavorAcceptance,
              amateurRepeatIntentionScore: amateurValues.repeatIntention,
              amateurComment: amateurValues.comment,
            };
      const result = await client.submitMyScore(competitionId, roundId, beer.id, payload);
      setScore(result.score);
      localStorage.removeItem(draftKey);
      setDraftNotice(null);
      setNotice("评分已提交");
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onLogout();
        return;
      }
      setError(readError(unknownError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Paper className={classes.shell!} p="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <PageHeader eyebrow="Score" title={beer ? `评鉴 #${beer.entryNumber}` : "评分"} />
          <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
            退出
          </Button>
        </Group>
        <Button
          leftSection={<ArrowLeft size={16} />}
          variant="default"
          onClick={() => {
            window.location.href = `/competitions/${competitionId}/rounds/${roundId}`;
          }}
        >
          返回轮次
        </Button>

        {beer ? (
          <Stack gap="sm">
            <Group gap="xs">
              <Badge variant="light">{judgeTypeFormLabel(effectiveJudgeType)}</Badge>
              <Badge color={beer.canScore ? "green" : "gray"} variant="light">
                {beer.canScore ? "可评分" : "只读"}
              </Badge>
            </Group>
            <Table withColumnBorders withTableBorder>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th w={110}>比赛序号</Table.Th>
                  <Table.Td>#{beer.entryNumber}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>参赛编号</Table.Th>
                  <Table.Td>{beer.entryCode}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>BJCP</Table.Th>
                  <Table.Td>
                    {beer.bjcpSubcategoryCode} {beer.bjcpSubcategoryName}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>介绍</Table.Th>
                  <Table.Td style={{ whiteSpace: "pre-wrap" }}>{beer.description}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        ) : null}

        {score ? (
          <Text c="dimmed" size="sm">
            上次提交：{new Date(score.submittedAt).toLocaleString()}
          </Text>
        ) : null}
        {draftNotice ? <Text c="orange.8">{draftNotice}</Text> : null}
        {notice ? <Text c="green.8">{notice}</Text> : null}
        {error ? <InlineError>{error}</InlineError> : null}

        {effectiveJudgeType === "professional" ? (
          <ProfessionalForm
            disabled={!beer?.canScore || status === "loading"}
            total={professionalTotal}
            values={professionalValues}
            onChange={setProfessionalValues}
          />
        ) : effectiveJudgeType === "public" ? (
          <AmateurForm
            disabled={!beer?.canScore || status === "loading"}
            total={amateurTotal}
            values={amateurValues}
            onChange={setAmateurValues}
          />
        ) : (
          <InlineError>当前账号没有预设裁判类型，请联系管理员。</InlineError>
        )}

        <Button
          disabled={!beer?.canScore || !effectiveJudgeType}
          leftSection={<Send size={16} />}
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          {score ? "更新评分" : "提交评分"}
        </Button>
      </Stack>
    </Paper>
  );
}

function ProfessionalForm({
  disabled,
  onChange,
  total,
  values,
}: {
  disabled: boolean;
  onChange: (values: ProfessionalValues) => void;
  total: number;
  values: ProfessionalValues;
}) {
  return (
    <Stack gap="md">
      <Text fw={800}>
        专业评分 {total}/50 · {professionalScoreGrade(total)}
      </Text>
      <ScoreDimension
        comment={values.aromaComment}
        disabled={disabled}
        label="Aroma 香气"
        max={12}
        placeholder="请描述麦芽香、酒花香、酯香、酚类、酒精感、氧化味、DMS、双乙酰等香气表现，并说明强弱和是否符合风格。"
        score={values.aroma}
        onComment={(aromaComment) => onChange({ ...values, aromaComment })}
        onScore={(aroma) => onChange({ ...values, aroma })}
      />
      <ScoreDimension
        comment={values.appearanceComment}
        disabled={disabled}
        label="Appearance 外观"
        max={3}
        placeholder="请描述颜色、清澈度、泡沫颜色、泡沫细腻度、泡持、挂杯等视觉表现。"
        score={values.appearance}
        onComment={(appearanceComment) => onChange({ ...values, appearanceComment })}
        onScore={(appearance) => onChange({ ...values, appearance })}
      />
      <ScoreDimension
        comment={values.flavorComment}
        disabled={disabled}
        label="Flavor 风味"
        max={20}
        placeholder="请描述入口、中段、收口、麦芽表现、酒花风味、苦度、甜度、酸度、发酵特征、余味、平衡感和明显缺陷。"
        score={values.flavor}
        onComment={(flavorComment) => onChange({ ...values, flavorComment })}
        onScore={(flavor) => onChange({ ...values, flavor })}
      />
      <ScoreDimension
        comment={values.mouthfeelComment}
        disabled={disabled}
        label="Mouthfeel 口感"
        max={5}
        placeholder="请描述酒体、杀口感、顺滑度、酒精温热感、涩感、黏腻感、干爽度等口感表现。"
        score={values.mouthfeel}
        onComment={(mouthfeelComment) => onChange({ ...values, mouthfeelComment })}
        onScore={(mouthfeel) => onChange({ ...values, mouthfeel })}
      />
      <ScoreDimension
        comment={values.overallComment}
        disabled={disabled}
        label="Overall Impression 整体印象"
        max={10}
        placeholder="请总结整体完成度、风格准确度、饮用愉悦度、主要优缺点和改进建议。"
        score={values.overall}
        onComment={(overallComment) => onChange({ ...values, overallComment })}
        onScore={(overall) => onChange({ ...values, overall })}
      />
    </Stack>
  );
}

function ScoreDimension({
  comment,
  disabled,
  label,
  max,
  onComment,
  onScore,
  placeholder,
  score,
}: {
  comment: string;
  disabled: boolean;
  label: string;
  max: number;
  onComment: (value: string) => void;
  onScore: (value: number) => void;
  placeholder: string;
  score: number;
}) {
  return (
    <Stack gap="xs">
      <Text fw={700}>{label}</Text>
      <NumberInput
        disabled={disabled}
        label={`分数 0-${max}`}
        max={max}
        min={0}
        value={score}
        onChange={(value) => onScore(toNumber(value))}
      />
      <Textarea
        autosize
        disabled={disabled}
        minRows={3}
        placeholder={placeholder}
        required
        value={comment}
        onChange={(event) => onComment(event.currentTarget.value)}
      />
    </Stack>
  );
}

function AmateurForm({
  disabled,
  onChange,
  total,
  values,
}: {
  disabled: boolean;
  onChange: (values: AmateurValues) => void;
  total: number;
  values: AmateurValues;
}) {
  return (
    <Stack gap="md">
      <Text fw={800}>爱好者评分 {total}/20</Text>
      <div className={classes.metricGrid!}>
        <NumberInput
          disabled={disabled}
          label="易饮性 1-5"
          max={5}
          min={1}
          value={values.drinkability}
          onChange={(value) => onChange({ ...values, drinkability: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="平衡感 1-5"
          max={5}
          min={1}
          value={values.balance}
          onChange={(value) => onChange({ ...values, balance: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="风味接受度 1-5"
          max={5}
          min={1}
          value={values.flavorAcceptance}
          onChange={(value) => onChange({ ...values, flavorAcceptance: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="复饮意愿 1-5"
          max={5}
          min={1}
          value={values.repeatIntention}
          onChange={(value) => onChange({ ...values, repeatIntention: toNumber(value) })}
        />
      </div>
      <Textarea
        autosize
        disabled={disabled}
        label="总反馈"
        minRows={4}
        required
        value={values.comment}
        onChange={(event) => onChange({ ...values, comment: event.currentTarget.value })}
      />
    </Stack>
  );
}
