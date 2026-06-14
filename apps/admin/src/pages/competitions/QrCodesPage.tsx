import { Button, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BeerQrCodeListResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { QrCodeCard } from "../../modules/competitions/components/QrCodeCard.js";
import { handleRequestError } from "../../utils/errors.js";

type QrBeer = BeerQrCodeListResult["beers"][number];

function readCompetitionId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function QrCodesPage({ onLogout }: { onLogout: () => void }) {
  const { competitionId: competitionIdParam } = useParams();
  const competitionId = readCompetitionId(competitionIdParam);
  const [beers, setBeers] = useState<QrBeer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  const refreshQrCodes = useCallback(async () => {
    if (!competitionId) {
      setError("比赛 ID 无效");
      setStatus("ready");
      return;
    }
    setError(null);
    const result = await client.listBeerQrCodes(competitionId);
    setBeers(result.beers);
    setStatus("ready");
  }, [competitionId]);

  useEffect(() => {
    void refreshQrCodes().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, refreshQrCodes]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <Button
            component={Link}
            leftSection={<ArrowLeft size={16} />}
            to={competitionId ? `/competitions/${competitionId}` : "/competitions"}
            variant="default"
          >
            返回
          </Button>
          <PageHeader
            eyebrow="QR Codes"
            title="二维码墙"
            description="仅展示已发布到比赛状态的酒款。"
          />
        </Group>
        <Button
          leftSection={<RefreshCw size={16} />}
          loading={status === "loading"}
          variant="default"
          onClick={() => {
            setStatus("loading");
            void refreshQrCodes().catch((unknownError) => {
              setStatus("ready");
              setError(handleRequestError(unknownError, onLogout));
            });
          }}
        >
          刷新
        </Button>
      </Group>

      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      {status === "ready" && beers.length === 0 ? (
        <Paper p="xl">
          <Text c="dimmed" ta="center">
            暂无可展示二维码的已发布酒款。
          </Text>
        </Paper>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
        {beers.map((beer) => (
          <QrCodeCard beer={beer} key={beer.id} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
