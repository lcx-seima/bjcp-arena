import { Button, Checkbox, Stack, Text, TextInput } from "@mantine/core";
import { Save, Shuffle, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hasRole, superAdminRole, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../../app/api.js";
import { InlineMessage } from "../../../components/ui/InlineMessage.js";
import { handleRequestError } from "../../../utils/errors.js";
import { randomNumericPassword } from "../../../utils/random.js";
import { RoleSelect } from "./RoleSelect.js";
import classes from "./UserRow.module.css";

export function UserRow({
  activeSuperAdminCount,
  currentUserId,
  user,
  onUnauthorized,
  onUpdated,
}: {
  activeSuperAdminCount: number;
  currentUserId: number;
  user: UserPublic;
  onUnauthorized: () => void;
  onUpdated: (user: UserPublic) => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [nickname, setNickname] = useState(user.nickname);
  const [roles, setRoles] = useState<number>(user.roles);
  const [disabled, setDisabled] = useState(user.disabled);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setUsername(user.username);
    setNickname(user.nickname);
    setRoles(user.roles);
    setDisabled(user.disabled);
  }, [user.authVersion, user.disabled, user.nickname, user.roles, user.updatedAt, user.username]);

  const isCurrentUser = user.id === currentUserId;
  const isExistingSuperAdmin = hasRole(user.roles, superAdminRole);
  const isActiveSuperAdmin = isExistingSuperAdmin && !user.disabled;
  const isOnlyActiveSuperAdmin = isActiveSuperAdmin && activeSuperAdminCount <= 1;
  const selectedHasSuperAdmin = hasRole(roles, superAdminRole);

  const protectionError = useMemo(() => {
    if (isCurrentUser && disabled) {
      return "不能停用当前登录账号。";
    }

    if (isCurrentUser && isExistingSuperAdmin && !selectedHasSuperAdmin) {
      return "不能把当前登录账号降权为非超级管理员。";
    }

    if (isOnlyActiveSuperAdmin && disabled) {
      return "系统只有 1 个未停用超级管理员，不能停用该账号。";
    }

    if (isOnlyActiveSuperAdmin && !selectedHasSuperAdmin) {
      return "系统只有 1 个未停用超级管理员，不能移除该账号的超级管理员角色。";
    }

    return null;
  }, [
    disabled,
    isCurrentUser,
    isExistingSuperAdmin,
    isOnlyActiveSuperAdmin,
    selectedHasSuperAdmin,
  ]);

  const hasChanges = useMemo(
    () =>
      username !== user.username ||
      nickname !== user.nickname ||
      roles !== user.roles ||
      disabled !== user.disabled,
    [disabled, nickname, roles, user.disabled, user.nickname, user.roles, user.username, username]
  );

  async function handleSave() {
    setError(null);

    if (protectionError) {
      setError(protectionError);
      return;
    }

    setIsSaving(true);

    try {
      const result = await client.updateUser(user.id, {
        username,
        nickname,
        roles,
        disabled,
      });
      onUpdated(result.user);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword() {
    setError(null);

    if (!password) {
      setError("请先填写新密码，或点击随机生成后再重置。");
      return;
    }

    setIsResetting(true);

    try {
      const result = await client.resetUserPassword(user.id, { password });
      onUpdated(result.user);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className={classes.row!} role="row">
      <TextInput
        label="用户名"
        pattern="[A-Za-z0-9]+"
        required
        value={username}
        onChange={(event) => setUsername(event.currentTarget.value)}
      />
      <TextInput
        label="昵称"
        required
        value={nickname}
        onChange={(event) => setNickname(event.currentTarget.value)}
      />
      <RoleSelect
        disabledSuperAdminRemoval={
          (isCurrentUser && isExistingSuperAdmin) || isOnlyActiveSuperAdmin
        }
        value={roles}
        onChange={setRoles}
      />
      <Stack gap={6}>
        <Text c="dimmed" fw={700} size="sm">
          状态
        </Text>
        <Checkbox
          checked={disabled}
          disabled={isCurrentUser || isOnlyActiveSuperAdmin}
          label={disabled ? "已停用" : "已启用"}
          onChange={(event) => setDisabled(event.currentTarget.checked)}
        />
      </Stack>
      <TextInput
        label="新密码"
        minLength={6}
        rightSection={
          <Button
            aria-label="随机密码"
            size="compact-xs"
            variant="subtle"
            onClick={() => setPassword(randomNumericPassword())}
          >
            <Shuffle size={14} />
          </Button>
        }
        value={password}
        onChange={(event) => setPassword(event.currentTarget.value)}
      />
      <div className={classes.actions!}>
        <Button
          disabled={!password}
          leftSection={<KeyRound size={16} />}
          loading={isResetting}
          variant="default"
          onClick={handleResetPassword}
        >
          重置密码
        </Button>
        <Button
          disabled={!hasChanges || protectionError !== null}
          leftSection={<Save size={16} />}
          loading={isSaving}
          onClick={handleSave}
        >
          保存
        </Button>
      </div>
      {protectionError ? (
        <Text c="orange.8" className={classes.message!} size="sm">
          {protectionError}
        </Text>
      ) : null}
      {error ? (
        <div className={classes.message!}>
          <InlineMessage type="error">{error}</InlineMessage>
        </div>
      ) : null}
    </div>
  );
}
