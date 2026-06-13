import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { LogIn } from "lucide-react";
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
  const form = useForm({
    initialValues: {
      username: "",
      password: "",
    },
  });

  async function handleSubmit(values: typeof form.values) {
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
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <PageHeader eyebrow="Admin Console" title="后台登录" description={`API：${apiBaseUrl}`} />

        <TextInput
          autoComplete="username"
          label="用户名"
          pattern="[A-Za-z0-9]+"
          required
          {...form.getInputProps("username")}
        />
        <PasswordInput
          autoComplete="current-password"
          label="密码"
          minLength={6}
          required
          {...form.getInputProps("password")}
        />

        {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

        <Button leftSection={<LogIn size={16} />} loading={isSubmitting} type="submit">
          登录
        </Button>
      </Stack>
    </form>
  );
}
