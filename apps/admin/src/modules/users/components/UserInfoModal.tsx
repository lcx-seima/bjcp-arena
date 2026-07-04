import { Button, Group, Modal, Stack, Switch, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Save, Shuffle, UserPlus } from "lucide-react";
import { useEffect, useMemo } from "react";
import { adminRole, hasRole, superAdminRole, type UserPublic } from "@bjcp-arena/contracts";
import { InlineMessage } from "../../../components/ui/InlineMessage.js";
import { randomAlphaNumeric, randomNumericPassword } from "../../../utils/random.js";
import { RoleCheckboxGroup } from "./RoleCheckboxGroup.js";

export interface UserInfoFormValues {
  disabled: boolean;
  nickname: string;
  password: string;
  roles: number;
  username: string;
}

export function UserInfoModal({
  activeSuperAdminCount,
  currentUserId,
  error,
  isSubmitting,
  mode,
  opened,
  user,
  onClose,
  onSubmit,
}: {
  activeSuperAdminCount: number;
  currentUserId: number;
  error: string | null;
  isSubmitting: boolean;
  mode: "create" | "edit";
  opened: boolean;
  user?: UserPublic | null;
  onClose: () => void;
  onSubmit: (values: UserInfoFormValues) => void;
}) {
  const form = useForm<UserInfoFormValues>({
    initialValues: {
      disabled: false,
      nickname: "",
      password: "",
      roles: adminRole,
      username: "",
    },
    validate: {
      nickname: (value) => (mode === "edit" && !value.trim() ? "请填写昵称" : null),
      password: (value) => (mode === "create" && !value ? "请填写初始密码" : null),
      roles: (value) => (value <= 0 ? "请至少选择 1 个角色" : null),
      username: (value) => (mode === "edit" && !value.trim() ? "请填写用户名" : null),
    },
  });

  useEffect(() => {
    if (!opened) {
      return;
    }

    form.setValues({
      disabled: user?.disabled ?? false,
      nickname: user?.nickname ?? "",
      password: "",
      roles: user?.roles ?? adminRole,
      username: user?.username ?? "",
    });
    form.clearErrors();
  }, [opened, mode, user?.disabled, user?.nickname, user?.roles, user?.username]);

  const isCurrentUser = user?.id === currentUserId;
  const isExistingSuperAdmin = user ? hasRole(user.roles, superAdminRole) : false;
  const isActiveSuperAdmin = isExistingSuperAdmin && user?.disabled === false;
  const isOnlyActiveSuperAdmin = isActiveSuperAdmin && activeSuperAdminCount <= 1;
  const selectedHasSuperAdmin = hasRole(form.values.roles, superAdminRole);

  const protectionError = useMemo(() => {
    if (mode !== "edit" || !user) {
      return null;
    }

    if (isCurrentUser && form.values.disabled) {
      return "不能停用当前登录账号。";
    }

    if (isCurrentUser && isExistingSuperAdmin && !selectedHasSuperAdmin) {
      return "不能把当前登录账号降权为非超级管理员。";
    }

    if (isOnlyActiveSuperAdmin && form.values.disabled) {
      return "系统只有 1 个未停用超级管理员，不能停用该账号。";
    }

    if (isOnlyActiveSuperAdmin && !selectedHasSuperAdmin) {
      return "系统只有 1 个未停用超级管理员，不能移除该账号的超级管理员角色。";
    }

    return null;
  }, [
    form.values.disabled,
    isCurrentUser,
    isExistingSuperAdmin,
    isOnlyActiveSuperAdmin,
    mode,
    selectedHasSuperAdmin,
    user,
  ]);

  return (
    <Modal
      centered
      opened={opened}
      title={mode === "create" ? "新建用户" : `编辑用户 ${user?.username ?? ""}`}
      onClose={onClose}
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label="用户名"
            pattern="[A-Za-z0-9]+"
            placeholder={mode === "create" ? "留空由后端生成" : undefined}
            required={mode === "edit"}
            rightSection={
              mode === "create" ? (
                <Button
                  aria-label="随机用户名"
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => form.setFieldValue("username", randomAlphaNumeric(6))}
                >
                  <Shuffle size={14} />
                </Button>
              ) : null
            }
            {...form.getInputProps("username")}
          />
          <TextInput
            label="昵称"
            placeholder={mode === "create" ? "留空由后端生成" : undefined}
            required={mode === "edit"}
            rightSection={
              mode === "create" ? (
                <Button
                  aria-label="随机昵称"
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => form.setFieldValue("nickname", `bjcp_${randomAlphaNumeric(6)}`)}
                >
                  <Shuffle size={14} />
                </Button>
              ) : null
            }
            {...form.getInputProps("nickname")}
          />
          {mode === "create" ? (
            <TextInput
              label="初始密码"
              minLength={6}
              required
              rightSection={
                <Button
                  aria-label="随机密码"
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => form.setFieldValue("password", randomNumericPassword())}
                >
                  <Shuffle size={14} />
                </Button>
              }
              {...form.getInputProps("password")}
            />
          ) : null}
          <RoleCheckboxGroup
            disabledSuperAdminRemoval={
              mode === "edit" && ((isCurrentUser && isExistingSuperAdmin) || isOnlyActiveSuperAdmin)
            }
            value={form.values.roles}
            onChange={(value) => form.setFieldValue("roles", value)}
          />
          {mode === "edit" ? (
            <Switch
              checked={!form.values.disabled}
              disabled={isCurrentUser || isOnlyActiveSuperAdmin}
              label={form.values.disabled ? "已停用" : "已启用"}
              onChange={(event) => form.setFieldValue("disabled", !event.currentTarget.checked)}
            />
          ) : null}
          {protectionError ? (
            <Text c="orange.8" size="sm">
              {protectionError}
            </Text>
          ) : null}
          {error ? <InlineMessage type="error">{error}</InlineMessage> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              取消
            </Button>
            <Button
              disabled={protectionError !== null}
              leftSection={mode === "create" ? <UserPlus size={16} /> : <Save size={16} />}
              loading={isSubmitting}
              type="submit"
            >
              {mode === "create" ? "创建用户" : "保存"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
