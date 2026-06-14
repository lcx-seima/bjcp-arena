import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { Eye, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client } from "../../app/api.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  competitionStatusLabels,
  type Competition,
} from "../../modules/competitions/competitions-api.js";
import {
  CompetitionForm,
  type CompetitionFormValues,
} from "../../modules/competitions/components/CompetitionForm.js";
import { handleRequestError } from "../../utils/errors.js";
import classes from "./CompetitionsPage.module.css";

export function CompetitionsPage({ onLogout }: { onLogout: () => void }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const refreshCompetitions = useCallback(async () => {
    setError(null);
    const result = await client.listCompetitions();
    setCompetitions(result.competitions);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void refreshCompetitions().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, refreshCompetitions]);

  async function handleCreate(values: CompetitionFormValues) {
    setError(null);
    setIsCreating(true);
    try {
      const result = await client.createCompetition({
        name: values.name,
        description: values.description || undefined,
      });
      setCompetitions((current) => [result.competition, ...current]);
      setNotice(`已创建比赛 ${result.competition.name}`);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <PageHeader eyebrow="Competitions" title="比赛管理" />
        <Button
          leftSection={<RefreshCw size={16} />}
          loading={status === "loading"}
          variant="default"
          onClick={() => {
            setStatus("loading");
            void refreshCompetitions().catch((unknownError) => {
              setStatus("ready");
              setError(handleRequestError(unknownError, onLogout));
            });
          }}
        >
          刷新
        </Button>
      </Group>

      <Paper p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <Plus size={18} />
            <Text fw={800}>新建比赛</Text>
          </Group>
          <CompetitionForm
            isSubmitting={isCreating}
            submitLabel="创建比赛"
            onSubmit={handleCreate}
          />
        </Stack>
      </Paper>

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      <Paper p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={800}>比赛列表</Text>
            <Text c="dimmed" size="sm">
              {status === "loading" ? "加载中..." : `${competitions.length} 场比赛`}
            </Text>
          </Group>
          <Stack gap="sm">
            {competitions.map((competition) => (
              <div className={classes.row!} key={competition.id}>
                <div>
                  <Text fw={800}>{competition.name}</Text>
                  <Text c="dimmed" lineClamp={2} size="sm">
                    {competition.description || "无说明"}
                  </Text>
                </div>
                <Badge variant="light">{competitionStatusLabels[competition.status]}</Badge>
                <Text c="dimmed" size="sm">
                  更新于 {new Date(competition.updatedAt).toLocaleString()}
                </Text>
                <Button
                  component={Link}
                  leftSection={<Eye size={16} />}
                  to={`/competitions/${competition.id}`}
                  variant="default"
                >
                  进入详情
                </Button>
              </div>
            ))}
            {status === "ready" && competitions.length === 0 ? (
              <Paper p="lg" withBorder={false}>
                <Text c="dimmed" ta="center">
                  暂无比赛。
                </Text>
              </Paper>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
