import { Stack, Text, Title } from "@mantine/core";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <Stack gap={6}>
      <Text c="dimmed" fw={800} size="xs" tt="uppercase">
        {eyebrow}
      </Text>
      <Title order={1} size="h2">
        {title}
      </Title>
      {description ? (
        <Text c="dimmed" style={{ overflowWrap: "anywhere" }}>
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}
