import { Button, Paper, Stack } from "@mantine/core";
import { LogOut } from "lucide-react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { apiBaseUrl } from "../../app/env.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { UserSummary } from "./UserSummary.js";

export function UserInfoPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <Paper maw={420} mx="auto" p="lg" w="100%">
      <Stack gap="md">
        <PageHeader eyebrow="Judge H5" title="当前登录用户" />
        <UserSummary apiBaseUrl={apiBaseUrl} user={user} />
        <Button color="red" leftSection={<LogOut size={16} />} variant="light" onClick={onLogout}>
          退出登录
        </Button>
      </Stack>
    </Paper>
  );
}
