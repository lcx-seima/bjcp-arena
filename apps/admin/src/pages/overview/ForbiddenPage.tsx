import { Paper, Stack, Text } from "@mantine/core";
import { PageHeader } from "../../components/ui/PageHeader.js";

export function ForbiddenPage() {
  return (
    <Paper p="lg">
      <Stack gap="md">
        <PageHeader eyebrow="Forbidden" title="无权访问" />
        <Text c="dimmed">账号管理仅超级管理员可见。</Text>
      </Stack>
    </Paper>
  );
}
