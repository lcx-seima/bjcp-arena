import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { JudgeCompetitionListResult, UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeCompetition = JudgeCompetitionListResult["competitions"][number];

export function JudgeCompetitionsPage({
  onLogout,
  user,
}: {
  onLogout: () => void;
  user: UserPublic;
}) {
  const [competitions, setCompetitions] = useState<JudgeCompetition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .listJudgeCompetitions()
      .then((result) => setCompetitions(result.competitions))
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [onLogout]);

  return (
    <Paper p="lg" style={{ maxWidth: 520, width: "100%" }}>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <PageHeader eyebrow="Judge" title="比赛列表" description={`当前账号：${user.nickname}`} />
          <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
            退出
          </Button>
        </Group>
        {error ? <InlineError>{error}</InlineError> : null}
        <Stack gap="sm">
          {competitions.map((competition) => (
            <Button
              h="auto"
              justify="space-between"
              key={competition.id}
              p="md"
              variant="light"
              onClick={() => {
                window.location.href = `/competitions/${competition.id}`;
              }}
            >
              <Text fw={800}>{competition.name}</Text>
              <Badge variant="white">{competition.status === "ongoing" ? "比赛中" : "结束"}</Badge>
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
