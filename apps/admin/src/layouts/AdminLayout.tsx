import { DashboardOutlined, LogoutOutlined, TeamOutlined, TrophyOutlined } from "@ant-design/icons";
import { Button, Layout, Menu, Space, Typography } from "antd";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { canManageUsers, type UserPublic } from "@bjcp-arena/contracts";
import { describeRoles } from "../utils/roles.js";
import { ForbiddenPage } from "../pages/overview/ForbiddenPage.js";
import { OverviewPage } from "../pages/overview/OverviewPage.js";
import { UsersPage } from "../pages/users/UsersPage.js";
import { CompetitionsPage } from "../pages/competitions/CompetitionsPage.js";
import { CompetitionDetailPage } from "../pages/competitions/CompetitionDetailPage.js";
import classes from "./AdminLayout.module.css";

export function AdminLayout({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = location.pathname.startsWith("/competitions")
    ? "/competitions"
    : location.pathname.startsWith("/users")
      ? "/users"
      : "/";

  const items = [
    {
      icon: <DashboardOutlined />,
      key: "/",
      label: "概览",
    },
    {
      icon: <TrophyOutlined />,
      key: "/competitions",
      label: "比赛管理",
    },
    ...(canManageUsers(user.roles)
      ? [
          {
            icon: <TeamOutlined />,
            key: "/users",
            label: "账号管理",
          },
        ]
      : []),
  ];

  return (
    <Layout className={classes.shell!}>
      <Layout.Sider breakpoint="lg" className={classes.sider!} collapsedWidth={0} width={252}>
        <div className={classes.navbar!}>
          <Space className={classes.brand!} direction="vertical" size={2}>
            <Typography.Text strong>BJCP Arena</Typography.Text>
            <Typography.Text type="secondary">后台管理</Typography.Text>
          </Space>

          <Menu
            items={items}
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => navigate(key)}
          />

          <div className={classes.account!}>
            <Typography.Text strong style={{ overflowWrap: "anywhere" }}>
              {user.nickname}
            </Typography.Text>
            <Typography.Text style={{ overflowWrap: "anywhere" }} type="secondary">
              {describeRoles(user.roles)}
            </Typography.Text>
            <Button block icon={<LogoutOutlined />} onClick={onLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </Layout.Sider>

      <Layout.Content className={classes.page!}>
        <Routes>
          <Route index element={<OverviewPage user={user} />} />
          <Route path="/competitions" element={<CompetitionsPage onLogout={onLogout} />} />
          <Route
            path="/competitions/:competitionId"
            element={<CompetitionDetailPage onLogout={onLogout} />}
          />
          <Route
            path="/users"
            element={
              canManageUsers(user.roles) ? (
                <UsersPage currentUser={user} onLogout={onLogout} />
              ) : (
                <ForbiddenPage />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout.Content>
    </Layout>
  );
}
