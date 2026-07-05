import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { ArrowLeft, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { JudgeRoundListResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeRound = JudgeRoundListResult["rounds"][number];

export function JudgeRoundsPage({
  competitionId,
  onLogout,
}: {
  competitionId: number;
  onLogout: () => void;
}) {
  const [rounds, setRounds] = useState<JudgeRound[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .listJudgeRounds(competitionId)
      .then((result) => setRounds(result.rounds))
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [competitionId, onLogout]);

  return (
    <Paper p="lg" style={{ maxWidth: 520, width: "100%" }}>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <PageHeader eyebrow="Rounds" title="轮次列表" />
          <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
            退出
          </Button>
        </Group>
        <Button
          leftSection={<ArrowLeft size={16} />}
          variant="default"
          onClick={() => (window.location.href = "/")}
        >
          返回比赛
        </Button>
        {error ? <InlineError>{error}</InlineError> : null}
        <Stack gap="sm">
          {rounds.map((round) => (
            <Button
              h="auto"
              justify="space-between"
              key={round.id}
              p="md"
              variant="light"
              onClick={() => {
                window.location.href = `/competitions/${competitionId}/rounds/${round.id}`;
              }}
            >
              <Stack align="start" gap={2}>
                <Text fw={800}>{round.name}</Text>
                <Text size="sm">已提交 {round.submittedBeerCount} 款</Text>
              </Stack>
              <Badge variant="white">{round.status === "ongoing" ? "比赛中" : "结束"}</Badge>
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
