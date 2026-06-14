import { Anchor, Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { BeerQrCodeListResult } from "@bjcp-arena/contracts";

type QrBeer = BeerQrCodeListResult["beers"][number];

export function QrCodeCard({ beer }: { beer: QrBeer }) {
  return (
    <Paper p="lg" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={900} size="xl">
            #{beer.entryNumber}
          </Text>
          <Badge variant="light">{beer.bjcpSubcategoryCode}</Badge>
        </Group>
        <Text c="dimmed" size="sm">
          {beer.bjcpCategoryName} / {beer.bjcpSubcategoryName}
        </Text>
        <Paper bg="white" p="md" radius="sm" withBorder>
          <QRCodeSVG
            aria-label={`#${beer.entryNumber} 评分二维码`}
            bgColor="#ffffff"
            fgColor="#111827"
            includeMargin
            level="M"
            size={220}
            value={beer.judgeUrl}
            style={{ display: "block", height: "auto", maxWidth: "100%", width: "100%" }}
          />
        </Paper>
        <Anchor href={beer.judgeUrl} size="sm" style={{ overflowWrap: "anywhere" }} target="_blank">
          {beer.judgeUrl}
        </Anchor>
        <Button
          component="a"
          href={beer.judgeUrl}
          leftSection={<ExternalLink size={16} />}
          target="_blank"
          variant="default"
        >
          打开评分页
        </Button>
      </Stack>
    </Paper>
  );
}
