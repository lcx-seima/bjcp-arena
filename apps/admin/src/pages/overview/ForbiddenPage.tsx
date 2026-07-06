import { Card, Typography } from "antd";
import { PageHeader } from "../../components/ui/PageHeader.js";

export function ForbiddenPage() {
  return (
    <Card>
      <div className="stack-md">
        <PageHeader eyebrow="Forbidden" title="无权访问" />
        <Typography.Text type="secondary">账号管理仅超级管理员可见。</Typography.Text>
      </div>
    </Card>
  );
}
