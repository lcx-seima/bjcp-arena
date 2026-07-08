import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { type PropsWithChildren } from "react";
import { theme } from "./theme.js";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
