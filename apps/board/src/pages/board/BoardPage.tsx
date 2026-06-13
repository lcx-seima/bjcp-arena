import { Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { client } from "../../app/api.js";
import { apiBaseUrl } from "../../app/env.js";
import classes from "./BoardPage.module.css";

export function BoardPage() {
  const [message, setMessage] = useState("loading...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .ping()
      .then((result) => {
        setMessage(`${result.message} from ${result.service}`);
      })
      .catch((unknownError: unknown) => {
        setError(unknownError instanceof Error ? unknownError.message : "Unknown API error");
      });
  }, []);

  return (
    <main className={classes.shell!}>
      <div className={classes.content!}>
        <Stack className={classes.headline!} gap="md">
          <Text c="blue.1" fw={800} size="sm" tt="uppercase">
            Live Board
          </Text>
          <Title className={classes.title!}>BJCP Arena 实时大盘</Title>
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <MetricCard label="API" value={apiBaseUrl} />
          <MetricCard label="Ping" value={error ?? message} />
        </SimpleGrid>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper className={classes.metric!} p="xl">
      <Text c="blue.1" fw={800} size="sm" tt="uppercase">
        {label}
      </Text>
      <Text fw={800} mt="xs" size="xl" style={{ overflowWrap: "anywhere" }}>
        {value}
      </Text>
    </Paper>
  );
}
