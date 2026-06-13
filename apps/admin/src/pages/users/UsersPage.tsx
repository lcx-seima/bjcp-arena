import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hasRole, superAdminRole, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { CreateUserPanel } from "../../modules/users/components/CreateUserPanel.js";
import { UserRow } from "../../modules/users/components/UserRow.js";
import { handleRequestError } from "../../utils/errors.js";
import classes from "./UsersPage.module.css";

export function UsersPage({
  currentUser,
  onLogout,
}: {
  currentUser: UserPublic;
  onLogout: () => void;
}) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeSuperAdminCount = useMemo(
    () => users.filter((user) => !user.disabled && hasRole(user.roles, superAdminRole)).length,
    [users]
  );

  const refreshUsers = useCallback(async () => {
    setError(null);
    const result = await client.listUsers();
    setUsers(result.users);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void refreshUsers().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, refreshUsers]);

  function handleRefresh() {
    setStatus("loading");
    void refreshUsers().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }

  function handleCreated(user: UserPublic) {
    setUsers((currentUsers) => [user, ...currentUsers.filter((item) => item.id !== user.id)]);
    setNotice(`已创建用户 ${user.username}`);
  }

  function handleUpdated(user: UserPublic) {
    setUsers((currentUsers) => currentUsers.map((item) => (item.id === user.id ? user : item)));
    setNotice(`已更新用户 ${user.username}`);
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <PageHeader eyebrow="Users" title="账号管理" />
        <Button
          leftSection={<RefreshCw size={16} />}
          loading={status === "loading"}
          variant="default"
          onClick={handleRefresh}
        >
          刷新
        </Button>
      </Group>

      <CreateUserPanel onCreated={handleCreated} onUnauthorized={onLogout} />

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      <Paper p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={800}>用户列表</Text>
            <Text c="dimmed" size="sm">
              {status === "loading" ? "加载中..." : `${users.length} 个账号`}
            </Text>
          </Group>
          <div className={classes.tableHead!} role="row">
            <span>用户名</span>
            <span>昵称</span>
            <span>角色</span>
            <span>状态</span>
            <span>重置密码</span>
            <span>操作</span>
          </div>
          <Stack gap="sm" role="table" aria-label="用户列表">
            {users.map((user) => (
              <UserRow
                activeSuperAdminCount={activeSuperAdminCount}
                currentUserId={currentUser.id}
                key={user.id}
                user={user}
                onUnauthorized={onLogout}
                onUpdated={handleUpdated}
              />
            ))}
            {status === "ready" && users.length === 0 ? (
              <Paper p="lg" withBorder={false}>
                <Text c="dimmed" ta="center">
                  暂无用户。
                </Text>
              </Paper>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
