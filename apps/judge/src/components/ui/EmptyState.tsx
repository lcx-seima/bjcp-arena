import { ErrorBlock } from "antd-mobile";

export function EmptyState({ description, title }: { description?: string; title: string }) {
  return <ErrorBlock description={description} status="empty" title={title} />;
}
