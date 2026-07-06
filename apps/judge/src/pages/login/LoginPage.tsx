import { Button, Form, Input, Toast } from "antd-mobile";
import { useRef, useState } from "react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { apiBaseUrl } from "../../app/env.js";
import { BrandMark } from "../../components/ui/BrandMark.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

export function LoginPage({
  onLogin,
  onUnauthorized,
}: {
  onLogin: (token: string, user: UserPublic) => void;
  onUnauthorized: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  async function handleSubmit(values: { password: string; username: string }) {
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await client.login(values);
      Toast.show({ content: "登录成功", icon: "success" });
      onLogin(session.token, session.user);
    } catch (unknownError) {
      const message = isUnauthorized(unknownError) ? "用户名或密码错误" : readError(unknownError);
      if (isUnauthorized(unknownError)) {
        onUnauthorized();
      }
      setError(message);
      Toast.show({ content: message, icon: "fail" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MobileShell
      bottomAction={
        <Button
          block
          color="primary"
          loading={isSubmitting}
          onClick={() => submitRef.current?.click()}
        >
          登录
        </Button>
      }
      description={`API：${apiBaseUrl}`}
      title="裁判端登录"
    >
      <BrandMark variant="hero" subtitle="裁判端" />

      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[{ pattern: /^[A-Za-z0-9]+$/, required: true, message: "请填写用户名" }]}
        >
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[{ min: 6, required: true, message: "请填写密码" }]}
        >
          <Input autoComplete="current-password" type="password" />
        </Form.Item>
        <button ref={submitRef} className="sr-only" type="submit">
          登录
        </button>
      </Form>

      {error ? <InlineError>{error}</InlineError> : null}
    </MobileShell>
  );
}
