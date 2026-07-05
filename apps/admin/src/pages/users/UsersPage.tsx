import {
  Badge,
  Button,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { Edit3, KeyRound, Plus, RefreshCw } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { hasRole, superAdminRole, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import {
  UserInfoModal,
  type UserInfoFormValues,
} from "../../modules/users/components/UserInfoModal.js";
import { ResetPasswordModal } from "../../modules/users/components/ResetPasswordModal.js";
import { describeRoles } from "../../utils/roles.js";
import { handleRequestError } from "../../utils/errors.js";
import classes from "./UsersPage.module.css";

const userPageLimit = 50;

type UserModalState = { mode: "create"; user: null } | { mode: "edit"; user: UserPublic };

function CellTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip label={label} openDelay={300} position="top-start" withArrow withinPortal>
      <span className={classes.tooltipTarget!}>{children}</span>
    </Tooltip>
  );
}

export function UsersPage({
  currentUser,
  onLogout,
}: {
  currentUser: UserPublic;
  onLogout: () => void;
}) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [userModal, setUserModal] = useState<UserModalState | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserPublic | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const activeSuperAdminCount = useMemo(
    () => users.filter((user) => !user.disabled && hasRole(user.roles, superAdminRole)).length,
    [users]
  );

  const pageCount = Math.max(1, Math.ceil(total / userPageLimit));

  const refreshUsers = useCallback(
    async (nextPage = page) => {
      setError(null);
      const result = await client.listUsers({ page: nextPage, limit: userPageLimit });
      setUsers(result.users);
      setTotal(result.total);
      setPage(result.page);
      setStatus("ready");
    },
    [page]
  );

  useEffect(() => {
    setStatus("loading");
    void refreshUsers(page).catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, page, refreshUsers]);

  function handleRefresh() {
    setStatus("loading");
    void refreshUsers(page).catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }

  async function handleUserSubmit(values: UserInfoFormValues) {
    if (!userModal) {
      return;
    }

    setModalError(null);
    setIsSubmittingUser(true);

    try {
      if (userModal.mode === "create") {
        const result = await client.createUser({
          username: values.username.trim() || undefined,
          nickname: values.nickname.trim() || undefined,
          password: values.password,
          roles: values.roles,
          judgeType: values.judgeType,
        });
        setNotice(`已创建用户 ${result.user.username}`);
        setUserModal(null);
        await refreshUsers(1);
        return;
      }

      const result = await client.updateUser(userModal.user.id, {
        username: values.username.trim(),
        nickname: values.nickname.trim(),
        roles: values.roles,
        judgeType: values.judgeType,
        disabled: values.disabled,
      });
      setNotice(`已更新用户 ${result.user.username}`);
      setUserModal(null);
      await refreshUsers(page);
    } catch (unknownError) {
      setModalError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsSubmittingUser(false);
    }
  }

  async function handleResetPassword(password: string) {
    if (!resetPasswordUser) {
      return;
    }

    setResetError(null);
    setIsResettingPassword(true);

    try {
      const result = await client.resetUserPassword(resetPasswordUser.id, { password });
      setNotice(`已重置用户 ${result.user.username} 的密码`);
      setResetPasswordUser(null);
      await refreshUsers(page);
    } catch (unknownError) {
      setResetError(handleRequestError(unknownError, onLogout));
    } finally {
      setIsResettingPassword(false);
    }
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

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      <Paper p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={800}>用户列表</Text>
              <Text c="dimmed" size="sm">
                {status === "loading" ? "加载中..." : `共 ${total} 个账号，每页 ${userPageLimit} 条`}
              </Text>
            </div>
            <Button
              leftSection={<Plus size={16} />}
              onClick={() => {
                setModalError(null);
                setUserModal({ mode: "create", user: null });
              }}
            >
              新建用户
            </Button>
          </Group>

          <ScrollArea>
            <Table className={classes.table!} highlightOnHover miw={1040} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className={classes.idColumn!}>ID</Table.Th>
                  <Table.Th>用户名</Table.Th>
                  <Table.Th>昵称</Table.Th>
                  <Table.Th>角色</Table.Th>
                  <Table.Th>状态</Table.Th>
                  <Table.Th>创建时间</Table.Th>
                  <Table.Th>更新时间</Table.Th>
                  <Table.Th className={classes.actionsColumn!}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => {
                  const idText = `#${user.id}`;
                  const roleText = describeRoles(user.roles);
                  const statusText = user.disabled ? "已停用" : "已启用";
                  const createdAtText = new Date(user.createdAt).toLocaleString();
                  const updatedAtText = new Date(user.updatedAt).toLocaleString();

                  return (
                    <Table.Tr key={user.id}>
                      <Table.Td className={classes.idColumn!}>
                        <CellTooltip label={idText}>
                          <Text c="dimmed" className={classes.cellText!} fw={700} size="sm">
                            {idText}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={user.username}>
                          <Text className={classes.cellText!} fw={700}>
                            {user.username}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={user.nickname}>
                          <Text className={classes.cellText!}>{user.nickname}</Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={roleText}>
                          <Text className={classes.cellText!}>{roleText}</Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={statusText}>
                          <Badge color={user.disabled ? "gray" : "green"} variant="light">
                            {statusText}
                          </Badge>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={createdAtText}>
                          <Text c="dimmed" className={classes.cellText!} size="sm">
                            {createdAtText}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td>
                        <CellTooltip label={updatedAtText}>
                          <Text c="dimmed" className={classes.cellText!} size="sm">
                            {updatedAtText}
                          </Text>
                        </CellTooltip>
                      </Table.Td>
                      <Table.Td className={classes.actionsColumn!}>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <Button
                            leftSection={<Edit3 size={16} />}
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setModalError(null);
                              setUserModal({ mode: "edit", user });
                            }}
                          >
                            编辑
                          </Button>
                          <Button
                            leftSection={<KeyRound size={16} />}
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setResetError(null);
                              setResetPasswordUser(user);
                            }}
                          >
                            重置密码
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {status === "ready" && users.length === 0 ? (
            <Paper p="lg" withBorder={false}>
              <Text c="dimmed" ta="center">
                暂无用户。
              </Text>
            </Paper>
          ) : null}

          <Group justify="flex-end">
            <Pagination disabled={status === "loading"} total={pageCount} value={page} onChange={setPage} />
          </Group>
        </Stack>
      </Paper>

      <UserInfoModal
        activeSuperAdminCount={activeSuperAdminCount}
        currentUserId={currentUser.id}
        error={modalError}
        isSubmitting={isSubmittingUser}
        mode={userModal?.mode ?? "create"}
        opened={userModal !== null}
        user={userModal?.user ?? null}
        onClose={() => {
          setModalError(null);
          setUserModal(null);
        }}
        onSubmit={handleUserSubmit}
      />
      <ResetPasswordModal
        error={resetError}
        isSubmitting={isResettingPassword}
        opened={resetPasswordUser !== null}
        user={resetPasswordUser}
        onClose={() => {
          setResetError(null);
          setResetPasswordUser(null);
        }}
        onSubmit={handleResetPassword}
      />
    </Stack>
  );
}
