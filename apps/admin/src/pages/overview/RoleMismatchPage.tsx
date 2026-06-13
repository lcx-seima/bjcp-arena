import { Button, Paper, Stack, Text } from "@mantine/core";
import { LogOut } from "lucide-react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { describeRoles } from "../../utils/roles.js";

export function RoleMismatchPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <Paper maw={440} mx="auto" p="xl">
      <Stack gap="md">
        <PageHeader eyebrow="无权限" title="当前角色不能进入后台" />
        <Text c="dimmed">
          当前账号角色为 {describeRoles(user.roles)}。后台仅允许赛事管理员或超级管理员进入。
        </Text>
        <Button leftSection={<LogOut size={16} />} onClick={onLogout}>
          退出登录
        </Button>
      </Stack>
    </Paper>
  );
}
