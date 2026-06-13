import { Button, Group, Paper, Stack } from "@mantine/core";
import { LogOut, RotateCw } from "lucide-react";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";

export function RestoreErrorPage({
  error,
  onLogout,
  onRetry,
}: {
  error: string;
  onLogout: () => void;
  onRetry: () => void;
}) {
  return (
    <Paper maw={420} mx="auto" p="lg" w="100%">
      <Stack gap="md">
        <PageHeader eyebrow="Judge H5" title="恢复登录态失败" />
        <InlineError>{error}</InlineError>
        <Group grow>
          <Button leftSection={<RotateCw size={16} />} variant="default" onClick={onRetry}>
            重试
          </Button>
          <Button leftSection={<LogOut size={16} />} variant="default" onClick={onLogout}>
            退出登录
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
