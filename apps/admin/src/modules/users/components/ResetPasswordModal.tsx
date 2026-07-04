import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { KeyRound, Shuffle } from "lucide-react";
import { useEffect } from "react";
import type { UserPublic } from "@bjcp-arena/contracts";
import { InlineMessage } from "../../../components/ui/InlineMessage.js";
import { randomNumericPassword } from "../../../utils/random.js";

export function ResetPasswordModal({
  error,
  isSubmitting,
  opened,
  user,
  onClose,
  onSubmit,
}: {
  error: string | null;
  isSubmitting: boolean;
  opened: boolean;
  user: UserPublic | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const form = useForm({
    initialValues: {
      password: "",
    },
    validate: {
      password: (value) => (!value ? "请填写新密码" : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.setFieldValue("password", "");
      form.clearErrors();
    }
  }, [opened]);

  return (
    <Modal centered opened={opened} title={`重置密码 ${user?.username ?? ""}`} onClose={onClose}>
      <form onSubmit={form.onSubmit((values) => onSubmit(values.password))}>
        <Stack gap="md">
          <TextInput
            label="新密码"
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
          {error ? <InlineMessage type="error">{error}</InlineMessage> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              取消
            </Button>
            <Button leftSection={<KeyRound size={16} />} loading={isSubmitting} type="submit">
              重置密码
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
