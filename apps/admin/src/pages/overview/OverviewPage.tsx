import { Card, Typography } from "antd";
import { type UserPublic } from "@bjcp-arena/contracts";
import { apiBaseUrl } from "../../app/env.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { describeRoles } from "../../utils/roles.js";

export function OverviewPage({ user }: { user: UserPublic }) {
  return (
    <div className="stack-lg">
      <PageHeader eyebrow="Overview" title="概览" />
      <div className="metric-grid">
        <MetricCard label="当前账号" value={user.username} />
        <MetricCard label="角色" value={describeRoles(user.roles)} />
        <MetricCard label="API 地址" value={apiBaseUrl} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="stack-xs">
        <Typography.Text strong type="secondary">
          {label}
        </Typography.Text>
        <Typography.Text strong style={{ overflowWrap: "anywhere" }}>
          {value}
        </Typography.Text>
      </div>
    </Card>
  );
}
