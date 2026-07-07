import { KeyOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal } from "antd";
import { useEffect } from "react";
import type { UserPublic } from "@bjcp-arena/contracts";
import { randomNumericPassword } from "../../../utils/random.js";

export function ResetPasswordModal({
  isSubmitting,
  opened,
  user,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  opened: boolean;
  user: UserPublic | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [form] = Form.useForm<{ password: string }>();

  useEffect(() => {
    if (opened) {
      form.resetFields();
    }
  }, [form, opened]);

  return (
    <Modal
      centered
      confirmLoading={isSubmitting}
      okText="重置密码"
      open={opened}
      title={`重置密码 ${user?.username ?? ""}`}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values.password)}>
        <Form.Item
          label="新密码"
          name="password"
          rules={[{ min: 6, required: true, message: "请填写至少 6 位新密码" }]}
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
        <KeyOutlined style={{ display: "none" }} />
      </Form>
    </Modal>
  );
}
