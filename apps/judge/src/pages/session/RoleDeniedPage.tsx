import { Button } from "antd-mobile";
import { type UserPublic } from "@bjcp-arena/contracts";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { UserSummary } from "./UserSummary.js";

export function RoleDeniedPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <MobileShell
      bottomAction={
        <Button block onClick={onLogout}>
          退出当前账号
        </Button>
      }
      description="请使用裁判员角色账号登录。"
      title="当前账号不可用于裁判端"
    >
      <UserSummary user={user} />
    </MobileShell>
  );
}
