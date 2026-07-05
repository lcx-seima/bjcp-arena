import { Button, Group, Select, Stack, TextInput, Textarea } from "@mantine/core";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { CreateBeerInput } from "@bjcp-arena/contracts";
import type { Beer } from "../competitions-api.js";
import { bjcpStyleOptions } from "../competitions-api.js";

export type BeerFormValues = CreateBeerInput;

function readSubcategoryCode(beer?: Beer | null): BeerFormValues["bjcpSubcategoryCode"] {
  return (beer?.bjcpSubcategoryCode ?? "21A") as BeerFormValues["bjcpSubcategoryCode"];
}

export function BeerForm({
  beer,
  isSubmitting,
  submitLabel,
  onSubmit,
}: {
  beer?: Beer | null;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (values: BeerFormValues) => void;
}) {
  const [values, setValues] = useState<BeerFormValues>({
    entryCode: beer?.entryCode ?? "",
    name: beer?.name ?? "",
    brewery: beer?.brewery ?? "",
    bjcpSubcategoryCode: readSubcategoryCode(beer),
    description: beer?.description ?? "",
  });

  useEffect(() => {
    setValues({
      entryCode: beer?.entryCode ?? "",
      name: beer?.name ?? "",
      brewery: beer?.brewery ?? "",
      bjcpSubcategoryCode: readSubcategoryCode(beer),
      description: beer?.description ?? "",
    });
  }, [beer?.bjcpSubcategoryCode, beer?.brewery, beer?.description, beer?.entryCode, beer?.name]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...values, entryCode: values.entryCode.trim().toUpperCase() });
      }}
    >
      <Stack gap="md">
        <Group grow>
          <TextInput
            disabled={Boolean(beer)}
            label="参赛编号"
            maxLength={6}
            required
            value={values.entryCode}
            onChange={(event) => {
              const entryCode = event.currentTarget.value.toUpperCase();
              setValues((current) => ({ ...current, entryCode }));
            }}
          />
          <TextInput
            label="参赛酒名"
            maxLength={160}
            required
            value={values.name}
            onChange={(event) => {
              const name = event.currentTarget.value;
              setValues((current) => ({ ...current, name }));
            }}
          />
          <TextInput
            label="参赛酒厂"
            maxLength={160}
            required
            value={values.brewery}
            onChange={(event) => {
              const brewery = event.currentTarget.value;
              setValues((current) => ({ ...current, brewery }));
            }}
          />
        </Group>
        <Select
          allowDeselect={false}
          data={bjcpStyleOptions}
          label="BJCP 类型"
          required
          value={values.bjcpSubcategoryCode}
          onChange={(value) => {
            if (value) {
              setValues((current) => ({
                ...current,
                bjcpSubcategoryCode: value as BeerFormValues["bjcpSubcategoryCode"],
              }));
            }
          }}
        />
        <Textarea
          autosize
          label="裁判可见介绍"
          maxLength={5000}
          minRows={4}
          required
          value={values.description}
          onChange={(event) => {
            const description = event.currentTarget.value;
            setValues((current) => ({ ...current, description }));
          }}
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
