import { Button, Card, Space } from "antd-mobile";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";

export function RestoreErrorPage({
  error,
  onLogout,
  onRetry,
}: {
  error: string;
  onLogout: () => void;
  onRetry: () => void;
}) {
  return (
    <Card className="mobile-card">
      <div className="stack-md">
        <PageHeader eyebrow="Judge H5" title="恢复登录态失败" />
        <InlineError>{error}</InlineError>
        <Space block direction="vertical">
          <Button block onClick={onRetry}>
            重试
          </Button>
          <Button block onClick={onLogout}>
            退出登录
          </Button>
        </Space>
      </div>
    </Card>
  );
}
