import { ErrorBlock } from "antd-mobile";

export function InlineError({ children }: { children: string }) {
  return <ErrorBlock description={children} status="default" title="操作失败" />;
}
