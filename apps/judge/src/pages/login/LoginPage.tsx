import { Button, Paper, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { apiBaseUrl } from "../../app/env.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
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
      onLogin(session.token, session.user);
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onUnauthorized();
        setError("用户名或密码错误");
      } else {
        setError(readError(unknownError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Paper
      component="form"
      maw={420}
      mx="auto"
      p="lg"
      w="100%"
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <Stack gap="md">
        <PageHeader eyebrow="Judge H5" title="裁判端登录" description={`API：${apiBaseUrl}`} />

        <TextInput
          autoComplete="username"
          inputMode="text"
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

        {error ? <InlineError>{error}</InlineError> : null}

        <Button leftSection={<LogIn size={16} />} loading={isSubmitting} type="submit">
          登录
        </Button>
      </Stack>
    </Paper>
  );
}
