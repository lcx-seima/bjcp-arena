import { Button, PasswordInput, SimpleGrid, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { InlineMessage } from "../../components/ui/InlineMessage.js";
import { readError } from "../../utils/errors.js";

export function BootstrapPage({
  onSession,
}: {
  onSession: (token: string, user: UserPublic) => void;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    initialValues: {
      password: "",
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await client.bootstrapSuperAdmin(values);
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
        <PageHeader
          eyebrow="Bootstrap"
          title="初始化超级管理员"
          description="系统尚无用户，请设置初始超级管理员密码。"
        />

        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <TextInput label="用户名" readOnly value="superadmin" />
          <TextInput label="昵称" readOnly value="superadmin" />
        </SimpleGrid>

        <PasswordInput
          autoComplete="new-password"
          label="密码"
          minLength={6}
          required
          {...form.getInputProps("password")}
        />

        {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

        <Button leftSection={<KeyRound size={16} />} loading={isSubmitting} type="submit">
          创建并登录
        </Button>
      </Stack>
    </form>
  );
}
