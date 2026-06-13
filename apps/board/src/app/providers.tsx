import { MantineProvider } from "@mantine/core";
import { type PropsWithChildren } from "react";
import { theme } from "./theme.js";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      {children}
    </MantineProvider>
  );
}
