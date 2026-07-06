import { LogoutOutlined } from "@ant-design/icons";
import { Button, Card, Typography } from "antd";
import { type UserPublic } from "@bjcp-arena/contracts";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { describeRoles } from "../../utils/roles.js";

export function RoleMismatchPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <Card className="restore-card">
      <div className="stack-md">
        <PageHeader eyebrow="无权限" title="当前角色不能进入后台" />
        <Typography.Text type="secondary">
          当前账号角色为 {describeRoles(user.roles)}。后台仅允许赛事管理员或超级管理员进入。
        </Typography.Text>
        <Button icon={<LogoutOutlined />} type="primary" onClick={onLogout}>
          退出登录
        </Button>
      </div>
    </Card>
  );
}
