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
import { LogOut, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JudgeBeerResult, MyScoreResult, UserPublic } from "@bjcp-arena/contracts";
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

interface PublicValues {
  overallPreference: number;
  aromaBodyFoam: number;
  entryAcceptance: number;
  willingToDrink: number;
  comment: string;
}

export function ScorePage({
  beerId,
  competitionId,
  onLogout,
  user,
}: {
  beerId: number;
  competitionId: number;
  onLogout: () => void;
  user: UserPublic;
}) {
  const [beer, setBeer] = useState<JudgeBeer | null>(null);
  const [score, setScore] = useState<MyScore | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [professionalValues, setProfessionalValues] = useState<ProfessionalValues>({
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
  });
  const [publicValues, setPublicValues] = useState<PublicValues>({
    overallPreference: 5,
    aromaBodyFoam: 3,
    entryAcceptance: 3,
    willingToDrink: 3,
    comment: "",
  });

  const refreshScore = useCallback(async () => {
    setError(null);
    const [beerResult, scoreResult] = await Promise.all([
      client.getJudgeBeer(competitionId, beerId),
      client.getMyScore(competitionId, beerId),
    ]);
    setBeer(beerResult.beer);
    setScore(scoreResult.score);
    setStatus("ready");

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
    }

    if (scoreResult.score?.judgeTypeSnapshot === "public") {
      setPublicValues({
        overallPreference: scoreResult.score.publicOverallPreferenceScore ?? 5,
        aromaBodyFoam: scoreResult.score.publicAromaBodyFoamScore ?? 3,
        entryAcceptance: scoreResult.score.publicEntryAcceptanceScore ?? 3,
        willingToDrink: scoreResult.score.publicWillingToDrinkScore ?? 3,
        comment: scoreResult.score.publicComment ?? "",
      });
    }
  }, [beerId, competitionId]);

  useEffect(() => {
    void refreshScore().catch((unknownError) => {
      setStatus("ready");
      if (isUnauthorized(unknownError)) {
        onLogout();
        return;
      }
      setError(readError(unknownError));
    });
  }, [onLogout, refreshScore]);

  const professionalTotal = useMemo(
    () =>
      professionalValues.aroma +
      professionalValues.appearance +
      professionalValues.flavor +
      professionalValues.mouthfeel +
      professionalValues.overall,
    [professionalValues]
  );

  async function handleSubmit() {
    if (!user.judgeType || !beer) {
      setError("当前账号未预设评委身份，无法提交评分。");
      return;
    }
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const payload =
        user.judgeType === "professional"
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
              publicOverallPreferenceScore: publicValues.overallPreference,
              publicAromaBodyFoamScore: publicValues.aromaBodyFoam,
              publicEntryAcceptanceScore: publicValues.entryAcceptance,
              publicWillingToDrinkScore: publicValues.willingToDrink,
              publicComment: publicValues.comment,
            };
      const result = await client.submitMyScore(competitionId, beer.id, payload);
      setScore(result.score);
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
          <PageHeader eyebrow="Judge" title={beer ? `评鉴 #${beer.entryNumber}` : "评鉴酒款"} />
          <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
            退出
          </Button>
        </Group>

        {beer ? (
          <Stack gap="sm">
            <Group gap="xs">
              <Badge variant="light">{beer.bjcpSubcategoryCode}</Badge>
              <Badge color={beer.canScore ? "green" : "gray"} variant="light">
                {beer.canScore ? "可评分" : "不可评分"}
              </Badge>
            </Group>
            <Table withColumnBorders withTableBorder>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th w={110}>类型</Table.Th>
                  <Table.Td>
                    {beer.bjcpCategoryName} / {beer.bjcpSubcategoryName}
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

        <Text c="dimmed" size="sm">
          当前账号：{user.nickname}（{user.judgeType === "professional" ? "专业裁判" : user.judgeType === "public" ? "大众评委" : "未设置身份"}）
        </Text>
        {score ? (
          <Text c="dimmed" size="sm">
            上次提交：{new Date(score.submittedAt).toLocaleString()}
          </Text>
        ) : null}

        {notice ? <Text c="green.8">{notice}</Text> : null}
        {error ? <InlineError>{error}</InlineError> : null}

        {user.judgeType === "professional" ? (
          <ProfessionalForm
            disabled={!beer?.canScore || status === "loading"}
            total={professionalTotal}
            values={professionalValues}
            onChange={setProfessionalValues}
          />
        ) : user.judgeType === "public" ? (
          <PublicForm
            disabled={!beer?.canScore || status === "loading"}
            values={publicValues}
            onChange={setPublicValues}
          />
        ) : (
          <InlineError>当前账号没有预设评委身份，请联系管理员。</InlineError>
        )}

        <Button
          disabled={!beer?.canScore || !user.judgeType}
          leftSection={<Send size={16} />}
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          提交评分
        </Button>
      </Stack>
    </Paper>
  );
}

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value || 0);
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
      <Text fw={800}>专业裁判评分，总分 {total}/50</Text>
      <div className={classes.metricGrid!}>
        <NumberInput
          disabled={disabled}
          label="香气 0-12"
          max={12}
          min={0}
          value={values.aroma}
          onChange={(value) => onChange({ ...values, aroma: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="外观 0-3"
          max={3}
          min={0}
          value={values.appearance}
          onChange={(value) => onChange({ ...values, appearance: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="风味 0-20"
          max={20}
          min={0}
          value={values.flavor}
          onChange={(value) => onChange({ ...values, flavor: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="口感 0-5"
          max={5}
          min={0}
          value={values.mouthfeel}
          onChange={(value) => onChange({ ...values, mouthfeel: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="总体 0-10"
          max={10}
          min={0}
          value={values.overall}
          onChange={(value) => onChange({ ...values, overall: toNumber(value) })}
        />
      </div>
      <Textarea
        disabled={disabled}
        label="香气评语"
        value={values.aromaComment}
        onChange={(event) => onChange({ ...values, aromaComment: event.currentTarget.value })}
      />
      <Textarea
        disabled={disabled}
        label="外观评语"
        value={values.appearanceComment}
        onChange={(event) => onChange({ ...values, appearanceComment: event.currentTarget.value })}
      />
      <Textarea
        disabled={disabled}
        label="风味评语"
        value={values.flavorComment}
        onChange={(event) => onChange({ ...values, flavorComment: event.currentTarget.value })}
      />
      <Textarea
        disabled={disabled}
        label="口感评语"
        value={values.mouthfeelComment}
        onChange={(event) => onChange({ ...values, mouthfeelComment: event.currentTarget.value })}
      />
      <Textarea
        disabled={disabled}
        label="总体评语"
        value={values.overallComment}
        onChange={(event) => onChange({ ...values, overallComment: event.currentTarget.value })}
      />
    </Stack>
  );
}

function PublicForm({
  disabled,
  onChange,
  values,
}: {
  disabled: boolean;
  onChange: (values: PublicValues) => void;
  values: PublicValues;
}) {
  return (
    <Stack gap="md">
      <Text fw={800}>大众评委评分</Text>
      <div className={classes.metricGrid!}>
        <NumberInput
          disabled={disabled}
          label="总体喜欢程度 1-10"
          max={10}
          min={1}
          value={values.overallPreference}
          onChange={(value) => onChange({ ...values, overallPreference: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="香气/酒体/泡沫吸引力 1-5"
          max={5}
          min={1}
          value={values.aromaBodyFoam}
          onChange={(value) => onChange({ ...values, aromaBodyFoam: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="入口接受度 1-5"
          max={5}
          min={1}
          value={values.entryAcceptance}
          onChange={(value) => onChange({ ...values, entryAcceptance: toNumber(value) })}
        />
        <NumberInput
          disabled={disabled}
          label="是否愿意再喝 1-5"
          max={5}
          min={1}
          value={values.willingToDrink}
          onChange={(value) => onChange({ ...values, willingToDrink: toNumber(value) })}
        />
      </div>
      <Textarea
        disabled={disabled}
        label="简短评价"
        value={values.comment}
        onChange={(event) => onChange({ ...values, comment: event.currentTarget.value })}
      />
    </Stack>
  );
}
