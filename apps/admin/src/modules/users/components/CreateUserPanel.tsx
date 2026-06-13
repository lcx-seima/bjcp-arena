import { Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Shuffle, UserPlus } from "lucide-react";
import { useState } from "react";
import { adminRole, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../../app/api.js";
import { InlineMessage } from "../../../components/ui/InlineMessage.js";
import { handleRequestError } from "../../../utils/errors.js";
import { randomAlphaNumeric, randomNumericPassword } from "../../../utils/random.js";
import { RoleSelect } from "./RoleSelect.js";

interface CreateUserFormValues {
  username: string;
  nickname: string;
  password: string;
  roles: number;
}

export function CreateUserPanel({
  onCreated,
  onUnauthorized,
}: {
  onCreated: (user: UserPublic) => void;
  onUnauthorized: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateUserFormValues>({
    initialValues: {
      username: "",
      nickname: "",
      password: "",
      roles: adminRole,
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await client.createUser({
        username: values.username || undefined,
        nickname: values.nickname || undefined,
        password: values.password,
        roles: values.roles,
      });
      onCreated(result.user);
      form.setValues({ username: "", nickname: "", password: "", roles: adminRole });
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Paper component="form" p="lg" onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={800}>创建用户</Text>
            <Text c="dimmed" size="sm">
              用户名仅允许英文和数字
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
          <TextInput
            label="用户名"
            pattern="[A-Za-z0-9]+"
            placeholder="留空由后端生成"
            rightSection={
              <Button
                aria-label="随机用户名"
                size="compact-xs"
                variant="subtle"
                onClick={() => form.setFieldValue("username", randomAlphaNumeric(6))}
              >
                <Shuffle size={14} />
              </Button>
            }
            {...form.getInputProps("username")}
          />
          <TextInput
            label="昵称"
            placeholder="留空由后端生成"
            rightSection={
              <Button
                aria-label="随机昵称"
                size="compact-xs"
                variant="subtle"
                onClick={() => form.setFieldValue("nickname", `bjcp_${randomAlphaNumeric(6)}`)}
              >
                <Shuffle size={14} />
              </Button>
            }
            {...form.getInputProps("nickname")}
          />
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
          <RoleSelect
            value={form.values.roles}
            onChange={(value) => form.setFieldValue("roles", value)}
          />
        </SimpleGrid>

        {error ? <InlineMessage type="error">{error}</InlineMessage> : null}

        <Group justify="flex-end">
          <Button leftSection={<UserPlus size={16} />} loading={isSubmitting} type="submit">
            创建用户
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
