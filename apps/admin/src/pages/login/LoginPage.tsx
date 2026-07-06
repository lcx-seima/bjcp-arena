import { LoginOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { apiBaseUrl } from "../../app/env.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { readError } from "../../utils/errors.js";

export function LoginPage({ onSession }: { onSession: (token: string, user: UserPublic) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { password: string; username: string }) {
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await client.login(values);
      onSession(session.token, session.user);
      navigate("/", { replace: true });
    } catch (unknownError) {
      setError(readError(unknownError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <div className="stack-md">
        <PageHeader eyebrow="Admin Console" title="后台登录" description={`API：${apiBaseUrl}`} />

        <Form.Item
          label="用户名"
          name="username"
          rules={[{ pattern: /^[A-Za-z0-9]+$/, required: true, message: "请填写字母或数字用户名" }]}
        >
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[{ min: 6, required: true, message: "请填写至少 6 位密码" }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>

        {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

        <Button htmlType="submit" icon={<LoginOutlined />} loading={isSubmitting} type="primary">
          登录
        </Button>
      </div>
    </Form>
  );
}
