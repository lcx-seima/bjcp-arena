import { App as AntdApp, ConfigProvider } from "antd";
import { type PropsWithChildren } from "react";
import { theme } from "./theme.js";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
