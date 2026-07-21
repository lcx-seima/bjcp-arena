import { ThunderboltOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, Input, Modal, Select, Switch, Typography } from "antd";
import { useEffect, useMemo } from "react";
import {
  adminRole,
  hasRole,
  judgeTypeLabels,
  judgeTypes,
  judgeRole,
  superAdminRole,
  type JudgeType,
  type UserPublic,
} from "@bjcp-arena/contracts";
import { randomDefaultUsername, randomNumericPassword } from "../../../utils/random.js";
import { RoleCheckboxGroup } from "./RoleCheckboxGroup.js";

export interface UserInfoFormValues {
  disabled: boolean;
  judgeType: JudgeType | null;
  nickname: string;
  password: string;
  roles: number;
  username: string;
}

const judgeTypeOptions = judgeTypes.map((judgeType) => ({
  label: judgeTypeLabels[judgeType],
  value: judgeType,
}));

const resetFieldNames: Array<keyof UserInfoFormValues> = [
  "username",
  "nickname",
  "password",
  "roles",
  "judgeType",
];

export function UserInfoModal({
  currentUserId,
  isSubmitting,
  mode,
  opened,
  user,
  onClose,
  onSubmit,
}: {
  currentUserId: number;
  isSubmitting: boolean;
  mode: "create" | "edit";
  opened: boolean;
  user?: UserPublic | null;
  onClose: () => void;
  onSubmit: (values: UserInfoFormValues) => void;
}) {
  const [form] = Form.useForm<UserInfoFormValues>();
  const roles = Form.useWatch("roles", form) ?? adminRole;
  const disabled = Form.useWatch("disabled", form) ?? false;
  const selectedHasJudge = hasRole(roles, judgeRole);

  useEffect(() => {
    if (!opened) {
      return;
    }

    form.setFieldsValue({
      disabled: user?.disabled ?? false,
      judgeType: user?.judgeType ?? null,
      nickname: user?.nickname ?? "",
      password: "",
      roles: user?.roles ?? adminRole,
      username: user?.username ?? "",
    });
    form.setFields(resetFieldNames.map((name) => ({ errors: [], name })));
  }, [form, opened, user]);

  const isCurrentUser = user?.id === currentUserId;
  const isExistingSuperAdmin = user ? hasRole(user.roles, superAdminRole) : false;
  const selectedHasSuperAdmin = hasRole(roles, superAdminRole);

  const protectionError = useMemo(() => {
    if (mode !== "edit" || !user) {
      return null;
    }

    if (isCurrentUser && disabled) {
      return "不能停用当前登录账号。";
    }

    if (isCurrentUser && isExistingSuperAdmin && !selectedHasSuperAdmin) {
      return "不能把当前登录账号降权为非超级管理员。";
    }

    return null;
  }, [disabled, isCurrentUser, isExistingSuperAdmin, mode, selectedHasSuperAdmin, user]);

  return (
    <Modal
      centered
      confirmLoading={isSubmitting}
      okButtonProps={{ disabled: protectionError !== null }}
      okText={mode === "create" ? "创建用户" : "保存"}
      open={opened}
      title={mode === "create" ? "新建用户" : `编辑用户 ${user?.username ?? ""}`}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            ...(mode === "edit" ? [{ required: true, message: "请填写用户名" }] : []),
            { pattern: /^[A-Za-z0-9]*$/, message: "用户名只能包含字母和数字" },
          ]}
        >
          <Input
            placeholder={mode === "create" ? "留空由后端生成 tbc + 4 位数字" : undefined}
            suffix={
              mode === "create" ? (
                <Button
                  aria-label="随机用户名"
                  icon={<ThunderboltOutlined />}
                  size="small"
                  type="text"
                  onClick={() => form.setFieldValue("username", randomDefaultUsername())}
                />
              ) : null
            }
          />
        </Form.Item>

        <Form.Item
          label="昵称"
          name="nickname"
          rules={[
            ...(mode === "edit" ? [{ required: true, message: "请填写昵称" }] : []),
            { max: 64, message: "昵称最多 64 个字符" },
          ]}
        >
          <Input placeholder={mode === "create" ? "留空默认与用户名一致" : undefined} />
        </Form.Item>

        {mode === "create" ? (
          <Form.Item
            label="初始密码"
            name="password"
            rules={[{ min: 6, required: true, message: "请填写至少 6 位初始密码" }]}
          >
            <Input
              suffix={
                <Button
                  aria-label="随机密码"
                  icon={<ThunderboltOutlined />}
                  size="small"
                  type="text"
                  onClick={() => form.setFieldValue("password", randomNumericPassword())}
                />
              }
            />
          </Form.Item>
        ) : null}

        <Form.Item
          label="角色"
          name="roles"
          rules={[
            {
              validator: (_, value: number) =>
                value > 0 ? Promise.resolve() : Promise.reject(new Error("请至少选择 1 个角色")),
            },
          ]}
        >
          <RoleCheckboxGroup
            disabledSuperAdminRemoval={mode === "edit" && isCurrentUser && isExistingSuperAdmin}
          />
        </Form.Item>

        {selectedHasJudge ? (
          <Form.Item
            label="裁判类型"
            name="judgeType"
            rules={[{ required: true, message: "请选择裁判类型" }]}
          >
            <Select options={judgeTypeOptions} />
          </Form.Item>
        ) : null}

        {mode === "edit" ? (
          <Form.Item label="状态">
            <Switch
              checked={!disabled}
              checkedChildren="已启用"
              disabled={isCurrentUser}
              unCheckedChildren="已停用"
              onChange={(checked) => form.setFieldValue("disabled", !checked)}
            />
          </Form.Item>
        ) : null}

        {protectionError ? (
          <Typography.Text type="warning">{protectionError}</Typography.Text>
        ) : null}
        <Form.Item hidden name="disabled">
          <Checkbox />
        </Form.Item>
      </Form>
    </Modal>
  );
}
