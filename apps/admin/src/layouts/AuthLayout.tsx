import { Center, Container, Paper } from "@mantine/core";
import { type PropsWithChildren } from "react";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <Center mih="100vh" p="lg">
      <Container maw={440} w="100%">
        <Paper p="xl">{children}</Paper>
      </Container>
    </Center>
  );
}
