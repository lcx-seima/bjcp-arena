import {
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import {
  judgeTypeLabels,
  judgeTypes,
  roleLabels,
  userRoleValues,
  type JudgeType,
  type UserListQuery,
  type UserPublic,
} from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { useRequestFeedback } from "../../app/feedback.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import {
  UserInfoModal,
  type UserInfoFormValues,
} from "../../modules/users/components/UserInfoModal.js";
import { ResetPasswordModal } from "../../modules/users/components/ResetPasswordModal.js";
import { describeRoles } from "../../utils/roles.js";
import styles from "./UsersPage.module.css";

const userPageLimit = 50;

type UserModalState = { mode: "create"; user: null } | { mode: "edit"; user: UserPublic };
type UserFilters = Pick<UserListQuery, "judgeType" | "role" | "username">;

const roleFilterOptions = userRoleValues.map((role) => ({
  label: roleLabels[role],
  value: role,
}));

const judgeTypeFilterOptions = judgeTypes.map((judgeType) => ({
  label: judgeTypeLabels[judgeType],
  value: judgeType,
}));

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
  const [filterForm] = Form.useForm<UserFilters>();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>({});
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [userModal, setUserModal] = useState<UserModalState | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserPublic | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { showRequestError, showSuccess } = useRequestFeedback(onLogout);

  const pageCount = Math.max(1, Math.ceil(total / userPageLimit));

  const refreshUsers = useCallback(
    async (nextPage = page) => {
      const result = await client.listUsers({
        page: nextPage,
        limit: userPageLimit,
        ...appliedFilters,
      });
      setUsers(result.users);
      setTotal(result.total);
      setPage(result.page);
      setStatus("ready");
    },
    [appliedFilters, page]
  );

  useEffect(() => {
    setStatus("loading");
    void refreshUsers(page).catch((unknownError) => {
      setStatus("ready");
      showRequestError(unknownError);
    });
  }, [page, refreshUsers, showRequestError]);

  function handleRefresh() {
    setStatus("loading");
    void refreshUsers(page).catch((unknownError) => {
      setStatus("ready");
      showRequestError(unknownError);
    });
  }

  function handleFilterSubmit(values: UserFilters) {
    const username = values.username?.trim();
    setPage(1);
    setAppliedFilters({
      ...(username ? { username } : {}),
      ...(values.role ? { role: values.role } : {}),
      ...(values.judgeType ? { judgeType: values.judgeType } : {}),
    });
  }

  function handleFilterReset() {
    filterForm.resetFields();
    setPage(1);
    setAppliedFilters({});
  }

  async function handleUserSubmit(values: UserInfoFormValues) {
    if (!userModal) {
      return;
    }

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
        showSuccess(`已创建用户 ${result.user.username}`);
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
      showSuccess(`已更新用户 ${result.user.username}`);
      setUserModal(null);
      await refreshUsers(page);
    } catch (unknownError) {
      showRequestError(unknownError);
    } finally {
      setIsSubmittingUser(false);
    }
  }

  async function handleResetPassword(password: string) {
    if (!resetPasswordUser) {
      return;
    }

    setIsResettingPassword(true);

    try {
      const result = await client.resetUserPassword(resetPasswordUser.id, { password });
      showSuccess(`已重置用户 ${result.user.username} 的密码`);
      setResetPasswordUser(null);
      await refreshUsers(page);
    } catch (unknownError) {
      showRequestError(unknownError);
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className={`stack-lg ${styles.page!}`}>
      <Flex align="center" gap={16} justify="space-between" wrap>
        <PageHeader eyebrow="Users" title="账号管理" />
        <Button icon={<ReloadOutlined />} loading={status === "loading"} onClick={handleRefresh}>
          刷新
        </Button>
      </Flex>

      <Card className={styles.card!}>
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
                setUserModal({ mode: "create", user: null });
              }}
            >
              新建用户
            </Button>
          </Flex>

          <Form<UserFilters>
            className={styles.filterForm!}
            form={filterForm}
            layout="inline"
            onFinish={handleFilterSubmit}
          >
            <Form.Item label="用户名" name="username">
              <Input
                allowClear
                className={styles.filterUsername!}
                maxLength={32}
                placeholder="输入部分用户名"
                size="small"
              />
            </Form.Item>
            <Form.Item label="角色类型" name="role">
              <Select
                allowClear
                className={styles.filterSelect!}
                options={roleFilterOptions}
                placeholder="全部角色类型"
                size="small"
              />
            </Form.Item>
            <Form.Item label="裁判类型" name="judgeType">
              <Select
                allowClear
                className={styles.filterSelect!}
                options={judgeTypeFilterOptions}
                placeholder="全部裁判类型"
                size="small"
              />
            </Form.Item>
            <Flex className={styles.filterActions!} gap={8}>
              <Button size="small" onClick={handleFilterReset}>
                重置
              </Button>
              <Button htmlType="submit" icon={<SearchOutlined />} size="small" type="primary">
                查询
              </Button>
            </Flex>
          </Form>

          <div className={styles.tableContainer!}>
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
                  dataIndex: "judgeType",
                  render: (judgeType: JudgeType | null) =>
                    judgeType ? (
                      <EllipsisCell>{judgeTypeLabels[judgeType]}</EllipsisCell>
                    ) : (
                      <Typography.Text type="secondary">—</Typography.Text>
                    ),
                  title: "裁判类型",
                  width: 140,
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
                          setUserModal({ mode: "edit", user });
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        icon={<KeyOutlined />}
                        onClick={() => {
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
              scroll={{ x: 1440 }}
            />
          </div>

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
        currentUserId={currentUser.id}
        isSubmitting={isSubmittingUser}
        mode={userModal?.mode ?? "create"}
        opened={userModal !== null}
        user={userModal?.user ?? null}
        onClose={() => {
          setUserModal(null);
        }}
        onSubmit={handleUserSubmit}
      />
      <ResetPasswordModal
        isSubmitting={isResettingPassword}
        opened={resetPasswordUser !== null}
        user={resetPasswordUser}
        onClose={() => {
          setResetPasswordUser(null);
        }}
        onSubmit={handleResetPassword}
      />
    </div>
  );
}
