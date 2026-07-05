import { Button, Group, Stack, TextInput } from "@mantine/core";
import { Save } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { Competition } from "../competitions-api.js";

export interface CompetitionFormValues {
  name: string;
}

export function CompetitionForm({
  competition,
  isSubmitting,
  onCancel,
  submitLabel,
  submitLeftSection,
  onSubmit,
}: {
  competition?: Competition | null;
  isSubmitting: boolean;
  onCancel?: () => void;
  submitLabel: string;
  submitLeftSection?: ReactNode;
  onSubmit: (values: CompetitionFormValues) => void;
}) {
  const [values, setValues] = useState<CompetitionFormValues>({
    name: competition?.name ?? "",
  });

  useEffect(() => {
    setValues({
      name: competition?.name ?? "",
    });
  }, [competition?.name]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Stack gap="md">
        <TextInput
          label="比赛名称"
          maxLength={120}
          required
          value={values.name}
          onChange={(event) => {
            const name = event.currentTarget.value;
            setValues((current) => ({ ...current, name }));
          }}
        />
        <Group justify="flex-end">
          {onCancel ? (
            <Button variant="default" onClick={onCancel}>
              取消
            </Button>
          ) : null}
          <Button
            leftSection={submitLeftSection ?? <Save size={16} />}
            loading={isSubmitting}
            type="submit"
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
