import { Badge, Button, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { ArrowLeft, ExternalLink, QrCode, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BeerStatus } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { boardBaseUrl } from "../../app/env.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  beerStatusLabels,
  beerStatusOptions,
  competitionStatusLabels,
  competitionStatusOptions,
  type Beer,
  type Competition,
} from "../../modules/competitions/competitions-api.js";
import {
  BeerForm,
  type BeerFormValues,
} from "../../modules/competitions/components/BeerForm.js";
import {
  CompetitionForm,
  type CompetitionFormValues,
} from "../../modules/competitions/components/CompetitionForm.js";
import { handleRequestError } from "../../utils/errors.js";
import classes from "./CompetitionsPage.module.css";

function readCompetitionId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function CompetitionDetailPage({ onLogout }: { onLogout: () => void }) {
  const { competitionId: competitionIdParam } = useParams();
  const competitionId = readCompetitionId(competitionIdParam);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSavingCompetition, setIsSavingCompetition] = useState(false);
  const [isCreatingBeer, setIsCreatingBeer] = useState(false);
  const [isUpdatingCompetitionStatus, setIsUpdatingCompetitionStatus] = useState(false);

  const refreshDetail = useCallback(async () => {
    if (!competitionId) {
      setError("比赛 ID 无效");
      setStatus("ready");
      return;
    }
    setError(null);
    const [competitionResult, beerResult] = await Promise.all([
      client.getCompetition(competitionId),
      client.listBeers(competitionId),
    ]);
    setCompetition(competitionResult.competition);
    setBeers(beerResult.beers);
    setStatus("ready");
  }, [competitionId]);

  useEffect(() => {
    void refreshDetail().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, refreshDetail]);

  async function handleUpdateCompetition(values: CompetitionFormValues) {
    if (!competitionId) {
      return;
    }
    setError(null);
    setIsSavingCompetition(true);
    try {
      const result = await client.updateCompetition(competitionId, {
        name: values.name,
        description: values.description || undefined,
      });
      setCompetition(result.competition);
      setNotice("比赛信息已保存");
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsSavingCompetition(false);
    }
  }

  async function handleUpdateCompetitionStatus(nextStatus: string | null) {
    if (!competitionId || !nextStatus) {
      return;
    }
    setError(null);
    setIsUpdatingCompetitionStatus(true);
    try {
      const result = await client.updateCompetitionStatus(competitionId, {
        status: nextStatus as Competition["status"],
      });
      setCompetition(result.competition);
      setNotice(`比赛状态已更新为 ${competitionStatusLabels[result.competition.status]}`);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsUpdatingCompetitionStatus(false);
    }
  }

  async function handleCreateBeer(values: BeerFormValues) {
    if (!competitionId) {
      return;
    }
    setError(null);
    setIsCreatingBeer(true);
    try {
      const result = await client.createBeer(competitionId, values);
      setBeers((current) => [...current, result.beer].sort((a, b) => a.entryNumber - b.entryNumber));
      setNotice(`已录入 #${result.beer.entryNumber} ${result.beer.realName}`);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsCreatingBeer(false);
    }
  }

  function handleBeerUpdated(beer: Beer) {
    setBeers((current) => current.map((item) => (item.id === beer.id ? beer : item)));
    setNotice(`#${beer.entryNumber} 已更新`);
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <Button component={Link} leftSection={<ArrowLeft size={16} />} to="/competitions" variant="default">
            返回
          </Button>
          <PageHeader
            eyebrow="Competition"
            title={competition?.name ?? "比赛详情"}
            description={competition?.description ?? undefined}
          />
        </Group>
        <Button
          leftSection={<RefreshCw size={16} />}
          loading={status === "loading"}
          variant="default"
          onClick={() => {
            setStatus("loading");
            void refreshDetail().catch((unknownError) => {
              setStatus("ready");
              setError(handleRequestError(unknownError, onLogout));
            });
          }}
        >
          刷新
        </Button>
      </Group>

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      {competition ? (
        <Paper p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={800}>比赛信息</Text>
              <Badge variant="light">{competitionStatusLabels[competition.status]}</Badge>
            </Group>
            <CompetitionForm
              competition={competition}
              isSubmitting={isSavingCompetition}
              submitLabel="保存比赛信息"
              onSubmit={handleUpdateCompetition}
            />
            <Group align="end">
              <Select
                allowDeselect={false}
                data={competitionStatusOptions}
                label="比赛状态"
                value={competition.status}
                onChange={handleUpdateCompetitionStatus}
              />
              <Button
                component={Link}
                leftSection={<QrCode size={16} />}
                to={`/competitions/${competition.id}/qr-codes`}
                variant="default"
              >
                二维码墙
              </Button>
              <Button
                component="a"
                href={`${boardBaseUrl.replace(/\/+$/, "")}/competitions/${competition.id}`}
                leftSection={<ExternalLink size={16} />}
                target="_blank"
                variant="default"
              >
                大屏入口
              </Button>
              {isUpdatingCompetitionStatus ? (
                <Text c="dimmed" size="sm">
                  状态更新中...
                </Text>
              ) : null}
            </Group>
          </Stack>
        </Paper>
      ) : null}

      <Paper p="lg">
        <Stack gap="md">
          <Text fw={800}>录入酒款</Text>
          <BeerForm isSubmitting={isCreatingBeer} submitLabel="新增酒款" onSubmit={handleCreateBeer} />
        </Stack>
      </Paper>

      <Paper p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={800}>酒款列表</Text>
            <Text c="dimmed" size="sm">
              {status === "loading" ? "加载中..." : `${beers.length} 款酒`}
            </Text>
          </Group>
          <Stack gap="sm">
            {beers.map((beer) => (
              <BeerRow
                beer={beer}
                competitionId={competitionId}
                key={beer.id}
                onUnauthorized={onLogout}
                onUpdated={handleBeerUpdated}
              />
            ))}
            {status === "ready" && beers.length === 0 ? (
              <Paper p="lg" withBorder={false}>
                <Text c="dimmed" ta="center">
                  暂无酒款。
                </Text>
              </Paper>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

function BeerRow({
  beer,
  competitionId,
  onUnauthorized,
  onUpdated,
}: {
  beer: Beer;
  competitionId: number | null;
  onUnauthorized: () => void;
  onUpdated: (beer: Beer) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(values: BeerFormValues) {
    if (!competitionId) {
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const result = await client.updateBeer(competitionId, beer.id, values);
      onUpdated(result.beer);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(nextStatus: string | null) {
    if (!competitionId || !nextStatus) {
      return;
    }
    setError(null);
    setIsUpdatingStatus(true);
    try {
      const result = await client.updateBeerStatus(competitionId, beer.id, {
        status: nextStatus as BeerStatus,
      });
      onUpdated(result.beer);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <div className={classes.beerRow!}>
      <Stack gap={4}>
        <Text c="dimmed" fw={800} size="xs">
          编号
        </Text>
        <Text fw={900}>#{beer.entryNumber}</Text>
      </Stack>
      <div className={classes.message!}>
        <BeerForm beer={beer} isSubmitting={isSaving} submitLabel="保存酒款" onSubmit={handleSave} />
      </div>
      <Select
        allowDeselect={false}
        data={beerStatusOptions}
        label="酒款状态"
        value={beer.status}
        onChange={handleStatusChange}
      />
      <Stack gap={6}>
        <Text c="dimmed" fw={800} size="xs">
          当前状态
        </Text>
        <Badge variant="light">{beerStatusLabels[beer.status]}</Badge>
        {isUpdatingStatus ? (
          <Text c="dimmed" size="sm">
            状态更新中...
          </Text>
        ) : null}
      </Stack>
      <Text c="dimmed" size="sm">
        {beer.bjcpCategoryName} / {beer.bjcpSubcategoryName}
      </Text>
      {error ? (
        <div className={classes.message!}>
          <InlineMessage type="error">{error}</InlineMessage>
        </div>
      ) : null}
    </div>
  );
}
