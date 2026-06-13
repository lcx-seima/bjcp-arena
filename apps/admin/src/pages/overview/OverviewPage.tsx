import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { type UserPublic } from "@bjcp-arena/contracts";
import { apiBaseUrl } from "../../app/env.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { describeRoles } from "../../utils/roles.js";

export function OverviewPage({ user }: { user: UserPublic }) {
  return (
    <Stack gap="lg">
      <PageHeader eyebrow="Overview" title="概览" />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <MetricCard label="当前账号" value={user.username} />
        <MetricCard label="角色" value={describeRoles(user.roles)} />
        <MetricCard label="API 地址" value={apiBaseUrl} />
      </SimpleGrid>
    </Stack>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper p="lg">
      <Stack gap={6}>
        <Text c="dimmed" fw={700} size="sm">
          {label}
        </Text>
        <Text fw={800} style={{ overflowWrap: "anywhere" }}>
          {value}
        </Text>
      </Stack>
    </Paper>
  );
}
