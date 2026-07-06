import { Alert } from "antd";

export function InlineMessage({ children, type }: { children: string; type: "error" | "success" }) {
  return <Alert message={children} showIcon type={type} />;
}
