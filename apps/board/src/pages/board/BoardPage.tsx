import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { LogOut, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BoardCompetitionSummary } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { apiBaseUrl } from "../../app/env.js";
import { readToken } from "../../app/session.js";
import classes from "./BoardPage.module.css";

export function BoardPage({
  competitionId,
  onLogout,
}: {
  competitionId: number;
  onLogout: () => void;
}) {
  const [summary, setSummary] = useState<BoardCompetitionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSummary = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const nextSummary = await client.getBoardCompetitionSummary(competitionId);
      setSummary(nextSummary);
      setError(null);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "大屏数据加载失败");
    } finally {
      setIsRefreshing(false);
    }
  }, [competitionId]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    const controller = new AbortController();
    const intervalId = window.setInterval(() => void refreshSummary(), 30000);

    async function subscribeEvents() {
      const token = readToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl.replace(/\/+$/, "")}/api/board/competitions/${competitionId}/events`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        if (!response.ok || !response.body) {
          void refreshSummary();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          if (chunks.some((chunk) => chunk.includes("event:"))) {
            void refreshSummary();
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          void refreshSummary();
        }
      }
    }

    void subscribeEvents();

    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, [competitionId, refreshSummary]);

  return (
    <main className={classes.shell!}>
      <Stack className={classes.content!} gap="xl">
        <Group justify="space-between">
          <div>
            <Text c="teal.2" fw={800} size="sm" tt="uppercase">
              Live Board
            </Text>
            <Title className={classes.title!}>{summary?.competition.name ?? "比赛实时大盘"}</Title>
          </div>
          <Group>
            <Button
              leftSection={<RefreshCw size={16} />}
              loading={isRefreshing}
              variant="default"
              onClick={() => void refreshSummary()}
            >
              刷新
            </Button>
            <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
              退出
            </Button>
          </Group>
        </Group>

        {error ? (
          <Paper className={classes.warning!} p="lg">
            <Text fw={800}>{error}</Text>
          </Paper>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <MetricCard label="比赛状态" value={summary?.competition.status ?? "-"} />
          <MetricCard label="酒款数量" value={String(summary?.beerCount ?? "-")} />
          <MetricCard
            label="更新时间"
            value={summary ? new Date(summary.updatedAt).toLocaleTimeString() : "-"}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2, xl: 3 }}>
          {summary?.beers.map((beer) => (
            <Paper className={classes.beerCard!} key={beer.beerId} p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={900} size="xl">
                    酒款 #{beer.entryNumber}
                  </Text>
                  <Badge color="teal" variant="light">
                    {beer.bjcpSubcategoryCode}
                  </Badge>
                </Group>
                {beer.realName || beer.producer ? (
                  <div>
                    <Text fw={800}>{beer.realName ?? "未公布酒名"}</Text>
                    <Text c="gray.4" size="sm">
                      {beer.producer ?? "未公布厂牌"}
                    </Text>
                  </div>
                ) : null}
                <Text c="gray.4" size="sm">
                  {beer.bjcpCategoryName} / {beer.bjcpSubcategoryName}
                </Text>
                <SimpleGrid cols={2}>
                  <ScoreBlock
                    label="专业均分"
                    subLabel={`${beer.professionalJudgeCount} 份`}
                    value={
                      beer.professionalAverageTotalScore === null
                        ? "-"
                        : beer.professionalAverageTotalScore.toFixed(1)
                    }
                  />
                  <ScoreBlock
                    label="大众喜爱"
                    subLabel={`${beer.publicJudgeCount} 份`}
                    value={
                      beer.publicAverageOverallPreference === null
                        ? "-"
                        : beer.publicAverageOverallPreference.toFixed(1)
                    }
                  />
                  <ScoreBlock
                    label="香气酒体泡沫"
                    value={
                      beer.publicAverageAromaBodyFoam === null
                        ? "-"
                        : beer.publicAverageAromaBodyFoam.toFixed(1)
                    }
                  />
                  <ScoreBlock
                    label="入口接受度"
                    value={
                      beer.publicAverageEntryAcceptance === null
                        ? "-"
                        : beer.publicAverageEntryAcceptance.toFixed(1)
                    }
                  />
                </SimpleGrid>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper className={classes.metric!} p="lg">
      <Text c="gray.4" fw={800} size="sm" tt="uppercase">
        {label}
      </Text>
      <Text fw={900} mt={6} size="xl" style={{ overflowWrap: "anywhere" }}>
        {value}
      </Text>
    </Paper>
  );
}

function ScoreBlock({
  label,
  subLabel,
  value,
}: {
  label: string;
  subLabel?: string;
  value: string;
}) {
  return (
    <Paper className={classes.scoreBlock!} p="md">
      <Text c="gray.4" fw={800} size="xs">
        {label}
      </Text>
      <Text fw={900} size="xl">
        {value}
      </Text>
      {subLabel ? (
        <Text c="gray.5" size="xs">
          {subLabel}
        </Text>
      ) : null}
    </Paper>
  );
}
