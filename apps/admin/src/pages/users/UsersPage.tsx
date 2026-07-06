import { EditOutlined, KeyOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Pagination, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const userPageLimit = 50;

type UserModalState = { mode: "create"; user: null } | { mode: "edit"; user: UserPublic };

function EllipsisCell({ children }: { children: string }) {
  return (
    <Tooltip title={children}>
      <Typography.Text ellipsis style={{ maxWidth: "100%" }}>
        {children}
      </Typography.Text>
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
    <div className="stack-lg">
      <Flex align="center" gap={16} justify="space-between" wrap>
        <PageHeader eyebrow="Users" title="账号管理" />
        <Button icon={<ReloadOutlined />} loading={status === "loading"} onClick={handleRefresh}>
          刷新
        </Button>
      </Flex>

      {notice ? <InlineMessage type="success">{notice}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

      <Card>
        <div className="stack-md">
          <Flex align="center" gap={16} justify="space-between" wrap>
            <div>
              <Typography.Text strong>用户列表</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                {status === "loading"
                  ? "加载中..."
                  : `共 ${total} 个账号，每页 ${userPageLimit} 条`}
              </Typography.Text>
            </div>
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setModalError(null);
                setUserModal({ mode: "create", user: null });
              }}
            >
              新建用户
            </Button>
          </Flex>

          <Table<UserPublic>
            columns={[
              {
                dataIndex: "id",
                fixed: "left",
                render: (id: number) => <Typography.Text type="secondary">#{id}</Typography.Text>,
                title: "ID",
                width: 80,
              },
              {
                dataIndex: "username",
                render: (value: string) => <EllipsisCell>{value}</EllipsisCell>,
                title: "用户名",
                width: 160,
              },
              {
                dataIndex: "nickname",
                render: (value: string) => <EllipsisCell>{value}</EllipsisCell>,
                title: "昵称",
                width: 160,
              },
              {
                dataIndex: "roles",
                render: (roles: number) => <EllipsisCell>{describeRoles(roles)}</EllipsisCell>,
                title: "角色",
                width: 180,
              },
              {
                dataIndex: "disabled",
                render: (disabled: boolean) => (
                  <Tag color={disabled ? "default" : "success"}>
                    {disabled ? "已停用" : "已启用"}
                  </Tag>
                ),
                title: "状态",
                width: 100,
              },
              {
                dataIndex: "createdAt",
                render: (value: string) => (
                  <Typography.Text type="secondary">
                    {new Date(value).toLocaleString()}
                  </Typography.Text>
                ),
                title: "创建时间",
                width: 190,
              },
              {
                dataIndex: "updatedAt",
                render: (value: string) => (
                  <Typography.Text type="secondary">
                    {new Date(value).toLocaleString()}
                  </Typography.Text>
                ),
                title: "更新时间",
                width: 190,
              },
              {
                fixed: "right",
                render: (_, user) => (
                  <Space>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        setModalError(null);
                        setUserModal({ mode: "edit", user });
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      icon={<KeyOutlined />}
                      onClick={() => {
                        setResetError(null);
                        setResetPasswordUser(user);
                      }}
                    >
                      重置密码
                    </Button>
                  </Space>
                ),
                title: "操作",
                width: 240,
              },
            ]}
            dataSource={users}
            loading={status === "loading"}
            pagination={false}
            rowKey="id"
            scroll={{ x: 1300 }}
          />

          <Flex justify="flex-end">
            <Pagination
              current={page}
              disabled={status === "loading"}
              pageSize={userPageLimit}
              showSizeChanger={false}
              total={pageCount * userPageLimit}
              onChange={setPage}
            />
          </Flex>
        </div>
      </Card>

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
    </div>
  );
}
