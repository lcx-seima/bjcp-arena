import { Badge, Button, Group, Modal, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { ArrowLeft, Delete, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { JudgeRoundDetailResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeRoundDetail = JudgeRoundDetailResult;

const keypad = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function JudgeRoundDetailPage({
  competitionId,
  onLogout,
  roundId,
}: {
  competitionId: number;
  onLogout: () => void;
  roundId: number;
}) {
  const [detail, setDetail] = useState<JudgeRoundDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpened, setSheetOpened] = useState(false);
  const [entryCode, setEntryCode] = useState("");

  useEffect(() => {
    void client
      .getJudgeRound(competitionId, roundId)
      .then(setDetail)
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [competitionId, onLogout, roundId]);

  async function handleLookup() {
    setError(null);
    try {
      const result = await client.lookupJudgeBeer(competitionId, roundId, { entryCode });
      window.location.href = `/competitions/${competitionId}/rounds/${roundId}/beers/${result.beer.id}`;
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onLogout();
        return;
      }
      setError(readError(unknownError));
    }
  }

  const canStart = detail?.round.status === "ongoing";

  return (
    <Paper p="lg" style={{ maxWidth: 520, width: "100%" }}>
      <Stack gap="md" pb={72}>
        <Group justify="space-between" wrap="nowrap">
          <PageHeader eyebrow="Round" title={detail?.round.name ?? "轮次"} />
          <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
            退出
          </Button>
        </Group>
        <Button
          leftSection={<ArrowLeft size={16} />}
          variant="default"
          onClick={() => (window.location.href = `/competitions/${competitionId}`)}
        >
          返回轮次列表
        </Button>
        {error ? <InlineError>{error}</InlineError> : null}
        <Text c="dimmed">已提交酒款</Text>
        <Stack gap="sm">
          {detail?.beers.map((beer) => (
            <Button
              h="auto"
              justify="space-between"
              key={beer.id}
              p="md"
              variant="light"
              onClick={() => {
                window.location.href = `/competitions/${competitionId}/rounds/${roundId}/beers/${beer.id}`;
              }}
            >
              <Stack align="start" gap={2}>
                <Text fw={800}>
                  #{beer.entryNumber} {beer.entryCode}
                </Text>
                <Text size="sm">
                  {beer.bjcpSubcategoryCode} {beer.bjcpSubcategoryName}
                </Text>
              </Stack>
              <Badge variant="white">{new Date(beer.submittedAt).toLocaleTimeString()}</Badge>
            </Button>
          ))}
        </Stack>
      </Stack>

      <Button
        disabled={!canStart}
        leftSection={<Search size={16} />}
        pos="fixed"
        bottom={18}
        left={18}
        right={18}
        onClick={() => setSheetOpened(true)}
      >
        开始评比
      </Button>

      <Modal
        opened={sheetOpened}
        title="输入参赛编号"
        yOffset="35vh"
        onClose={() => setSheetOpened(false)}
      >
        <Stack gap="md">
          <Group grow gap={6}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Paper key={index} p="sm" ta="center" withBorder>
                <Text fw={900}>{entryCode[index] ?? ""}</Text>
              </Paper>
            ))}
          </Group>
          <SimpleGrid cols={6} spacing={6}>
            {keypad.map((key) => (
              <Button
                disabled={entryCode.length >= 6}
                key={key}
                variant="default"
                onClick={() => setEntryCode((current) => `${current}${key}`.slice(0, 6))}
              >
                {key}
              </Button>
            ))}
          </SimpleGrid>
          <Group grow>
            <Button
              leftSection={<Delete size={16} />}
              variant="default"
              onClick={() => setEntryCode("")}
            >
              清除
            </Button>
            <Button disabled={entryCode.length !== 6} onClick={() => void handleLookup()}>
              查询
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
