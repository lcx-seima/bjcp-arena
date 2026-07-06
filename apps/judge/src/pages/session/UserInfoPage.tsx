import { Button, Card } from "antd-mobile";
import { type UserPublic } from "@bjcp-arena/contracts";
import { apiBaseUrl } from "../../app/env.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { UserSummary } from "./UserSummary.js";

export function UserInfoPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <Card className="mobile-card">
      <div className="stack-md">
        <PageHeader eyebrow="Judge H5" title="当前登录用户" />
        <UserSummary apiBaseUrl={apiBaseUrl} user={user} />
        <Button block color="danger" fill="outline" onClick={onLogout}>
          退出登录
        </Button>
      </div>
    </Card>
  );
}
