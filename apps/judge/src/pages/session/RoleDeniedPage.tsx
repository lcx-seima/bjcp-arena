import { Button, Card } from "antd-mobile";
import { type UserPublic } from "@bjcp-arena/contracts";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { UserSummary } from "./UserSummary.js";

export function RoleDeniedPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <Card className="mobile-card">
      <div className="stack-md">
        <PageHeader
          eyebrow="Judge H5"
          title="当前账号不可用于裁判端"
          description="请使用裁判员角色账号登录。"
        />
        <UserSummary user={user} />
        <Button block onClick={onLogout}>
          退出当前账号
        </Button>
      </div>
    </Card>
  );
}
