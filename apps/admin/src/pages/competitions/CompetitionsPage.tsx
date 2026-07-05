import {
  Badge,
  Button,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { Edit3, Eye, Plus, RefreshCw } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client } from "../../app/api.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  entityStatusLabels,
  type Competition,
} from "../../modules/competitions/competitions-api.js";
import { type CompetitionFormValues } from "../../modules/competitions/components/CompetitionForm.js";
import { CompetitionInfoModal } from "../../modules/competitions/components/CompetitionInfoModal.js";
import { handleRequestError } from "../../utils/errors.js";
import classes from "./CompetitionsPage.module.css";

const competitionPageLimit = 50;

type CompetitionModalState =
  | { mode: "create"; competition: null }
  | { mode: "edit"; competition: Competition };

function CellTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip label={label} openDelay={300} position="top-start" withArrow withinPortal>
      <span className={classes.tooltipTarget!}>{children}</span>
    </Tooltip>
  );
}

export function CompetitionsPage({ onLogout }: { onLogout: () => void }) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [competitionModal, setCompetitionModal] = useState<CompetitionModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingCompetition, setIsSubmittingCompetition] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / competitionPageLimit));

  const refreshCompetitions = useCallback(
    async (nextPage = page) => {
      setError(null);
      const result = await client.listCompetitions({
        page: nextPage,
        limit: competitionPageLimit,
      });
      setCompetitions(result.competitions);
      setTotal(result.total);
      setPage(result.page);
      setStatus("ready");
    },
    [page]
  );

  useEffect(() => {
    setStatus("loading");
    void refreshCompetitions(page).catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, page, refreshCompetitions]);

  function handleRefresh() {
    setStatus("loading");
    void refreshCompetitions(page).catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }

  async function handleCompetitionSubmit(values: CompetitionFormValues) {
    if (!competitionModal) {
      return;
    }

    setModalError(null);
    setIsSubmittingCompetition(true);

    try {
      if (competitionModal.mode === "create") {
        const result = await client.createCompetition({
          name: values.name.trim(),
        });
        setNotice(`已创建比赛 ${result.competition.name}`);
        setCompetitionModal(null);
        await refreshCompetitions(1);
        return;
      }

      const result = await client.updateCompetition(competitionModal.competition.id, {
        name: values.name.trim(),
      });
      setNotice(`已更新比赛 ${result.competition.name}`);
      setCompetitionModal(null);
      await refreshCompetitions(page);
    } catch (unknownError) {
      setModalError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsSubmittingCompetition(false);
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
          onClick={handleRefresh}
        >
          刷新
        </Button>
      </Group>

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      <Paper p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={800}>比赛列表</Text>
              <Text c="dimmed" size="sm">
                {status === "loading"
                  ? "加载中..."
                  : `共 ${total} 场比赛，每页 ${competitionPageLimit} 条`}
              </Text>
            </div>
            <Button
              leftSection={<Plus size={16} />}
              onClick={() => {
                setModalError(null);
                setCompetitionModal({ mode: "create", competition: null });
              }}
            >
              新建比赛
            </Button>
          </Group>

          <ScrollArea>
            <Table className={classes.table!} highlightOnHover miw={1180} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className={classes.idColumn!}>ID</Table.Th>
                  <Table.Th>比赛名称</Table.Th>
                  <Table.Th className={classes.statusColumn!}>状态</Table.Th>
                  <Table.Th>创建时间</Table.Th>
                  <Table.Th>更新时间</Table.Th>
                  <Table.Th className={classes.actionsColumn!}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {competitions.map((competition) => {
                  const idText = `#${competition.id}`;
                  const statusText = entityStatusLabels[competition.status];
                  const createdAtText = new Date(competition.createdAt).toLocaleString();
                  const updatedAtText = new Date(competition.updatedAt).toLocaleString();

                  return (
                    <Table.Tr key={competition.id}>
                      <Table.Td className={classes.idColumn!}>
                        <CellTooltip label={idText}>
                          <Text c="dimmed" className={classes.cellText!} fw={700} size="sm">
                            {idText}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={competition.name}>
                          <Text className={classes.cellText!} fw={700}>
                            {competition.name}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td className={classes.statusColumn!}>
                        <CellTooltip label={statusText}>
                          <Badge variant="light">{statusText}</Badge>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={createdAtText}>
                          <Text c="dimmed" className={classes.cellText!} size="sm">
                            {createdAtText}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={updatedAtText}>
                          <Text c="dimmed" className={classes.cellText!} size="sm">
                            {updatedAtText}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td className={classes.actionsColumn!}>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <Button
                            className={classes.actionButton!}
                            component={Link}
                            leftSection={<Eye size={16} />}
                            size="sm"
                            to={`/competitions/${competition.id}`}
                            variant="default"
                          >
                            进入详情
                          </Button>
                          <Button
                            className={classes.actionButton!}
                            leftSection={<Edit3 size={16} />}
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setModalError(null);
                              setCompetitionModal({ mode: "edit", competition });
                            }}
                          >
                            编辑
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {status === "ready" && competitions.length === 0 ? (
            <Paper p="lg" withBorder={false}>
              <Text c="dimmed" ta="center">
                暂无比赛。
              </Text>
            </Paper>
          ) : null}

          <Group justify="flex-end">
            <Pagination
              disabled={status === "loading"}
              total={pageCount}
              value={page}
              onChange={setPage}
            />
          </Group>
        </Stack>
      </Paper>

      <CompetitionInfoModal
        competition={competitionModal?.competition ?? null}
        error={modalError}
        isSubmitting={isSubmittingCompetition}
        mode={competitionModal?.mode ?? "create"}
        opened={competitionModal !== null}
        onClose={() => {
          setModalError(null);
          setCompetitionModal(null);
        }}
        onSubmit={handleCompetitionSubmit}
      />
    </Stack>
  );
}
