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
    realName: beer?.realName ?? "",
    producer: beer?.producer ?? "",
    bjcpSubcategoryCode: readSubcategoryCode(beer),
    description: beer?.description ?? "",
  });

  useEffect(() => {
    setValues({
      realName: beer?.realName ?? "",
      producer: beer?.producer ?? "",
      bjcpSubcategoryCode: readSubcategoryCode(beer),
      description: beer?.description ?? "",
    });
  }, [beer?.bjcpSubcategoryCode, beer?.description, beer?.producer, beer?.realName]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <Stack gap="md">
        <Group grow>
          <TextInput
            label="真实酒款名"
            maxLength={160}
            required
            value={values.realName}
            onChange={(event) => {
              const realName = event.currentTarget.value;
              setValues((current) => ({ ...current, realName }));
            }}
          />
          <TextInput
            label="厂牌/出品"
            maxLength={160}
            required
            value={values.producer}
            onChange={(event) => {
              const producer = event.currentTarget.value;
              setValues((current) => ({ ...current, producer }));
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
