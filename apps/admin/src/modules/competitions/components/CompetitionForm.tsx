import { Button, Group, Stack, TextInput, Textarea } from "@mantine/core";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { Competition } from "../competitions-api.js";

export interface CompetitionFormValues {
  name: string;
  description: string;
}

export function CompetitionForm({
  competition,
  isSubmitting,
  submitLabel,
  onSubmit,
}: {
  competition?: Competition | null;
  isSubmitting: boolean;
  submitLabel: string;
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
          <Button leftSection={<Save size={16} />} loading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
