import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "sm",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  components: {
    Button: {
      defaultProps: {
        fw: 700,
      },
    },
    Paper: {
      defaultProps: {
        radius: "sm",
        withBorder: true,
      },
    },
  },
});
