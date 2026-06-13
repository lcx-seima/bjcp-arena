import { Button, Paper, Stack, Text } from "@mantine/core";
import { LogOut } from "lucide-react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { UserSummary } from "./UserSummary.js";

export function RoleDeniedPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <Paper maw={420} mx="auto" p="lg" w="100%">
      <Stack gap="md">
        <PageHeader eyebrow="Judge H5" title="当前账号不可用于裁判端" />
        <Text c="dimmed">请使用裁判员角色账号登录。</Text>
        <UserSummary user={user} />
        <Button leftSection={<LogOut size={16} />} variant="default" onClick={onLogout}>
          退出当前账号
        </Button>
      </Stack>
    </Paper>
  );
}
