import { KeyOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { useRequestFeedback } from "../../app/feedback.js";
import { PageHeader } from "../../components/ui/PageHeader.js";

export function BootstrapPage({
  onSession,
}: {
  onSession: (token: string, user: UserPublic) => void;
}) {
  const navigate = useNavigate();
  const { showRequestError, showSuccess } = useRequestFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { password: string }) {
    setIsSubmitting(true);

    try {
      const session = await client.bootstrapSuperAdmin(values);
      showSuccess("初始化完成，已登录");
      onSession(session.token, session.user);
      navigate("/", { replace: true });
    } catch (unknownError) {
      showRequestError(unknownError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <div className="stack-md">
        <PageHeader
          eyebrow="Bootstrap"
          title="初始化超级管理员"
          description="系统尚无用户，请设置初始超级管理员密码。"
        />

        <div className="form-grid-2">
          <Form.Item label="用户名">
            <Input readOnly value="superadmin" />
          </Form.Item>
          <Form.Item label="昵称">
            <Input readOnly value="superadmin" />
          </Form.Item>
        </div>

        <Form.Item
          label="密码"
          name="password"
          rules={[{ min: 6, required: true, message: "请填写至少 6 位密码" }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        <Button htmlType="submit" icon={<KeyOutlined />} loading={isSubmitting} type="primary">
          创建并登录
        </Button>
      </div>
    </Form>
  );
}
