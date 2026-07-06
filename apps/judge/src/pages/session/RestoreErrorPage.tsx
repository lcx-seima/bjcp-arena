import { Button, Space } from "antd-mobile";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";

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
    <MobileShell
      bottomAction={
        <Space block direction="vertical">
          <Button block color="primary" onClick={onRetry}>
            重试
          </Button>
          <Button block onClick={onLogout}>
            退出登录
          </Button>
        </Space>
      }
      title="恢复登录态失败"
    >
      <InlineError>{error}</InlineError>
    </MobileShell>
  );
}
