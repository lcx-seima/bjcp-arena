import { Button, Group, Stack, TextInput, Textarea } from "@mantine/core";
import { Save } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { Competition } from "../competitions-api.js";

export interface CompetitionFormValues {
  name: string;
  description: string;
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
    description: competition?.description ?? "",
  });

  useEffect(() => {
    setValues({
      name: competition?.name ?? "",
      description: competition?.description ?? "",
    });
  }, [competition?.description, competition?.name]);

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
          onChange={(event) => setValues((current) => ({ ...current, name: event.currentTarget.value }))}
        />
        <Textarea
          autosize
          label="比赛说明"
          maxLength={2000}
          minRows={3}
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.currentTarget.value }))
          }
        />
        <Group justify="flex-end">
          {onCancel ? (
            <Button variant="default" onClick={onCancel}>
              取消
            </Button>
          ) : null}
          <Button leftSection={submitLeftSection ?? <Save size={16} />} loading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
