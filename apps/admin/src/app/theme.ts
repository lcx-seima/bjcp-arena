import type { ThemeConfig } from "antd";

export const theme: ThemeConfig = {
  token: {
    borderRadius: 6,
    colorPrimary: "#1677ff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  components: {
    Button: {
      fontWeight: 700,
    },
    Card: {
      borderRadiusLG: 6,
    },
  },
};
