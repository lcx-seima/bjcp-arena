import { type UserPublic } from "@bjcp-arena/contracts";
import { apiBaseUrl } from "../../app/env.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { UserSummary } from "./UserSummary.js";

export function UserInfoPage({ user }: { user: UserPublic }) {
  return (
    <MobileShell title="当前登录用户">
      <UserSummary apiBaseUrl={apiBaseUrl} user={user} />
    </MobileShell>
  );
}
