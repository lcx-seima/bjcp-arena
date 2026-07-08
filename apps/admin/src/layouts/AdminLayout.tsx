import { DashboardOutlined, LogoutOutlined, TeamOutlined, TrophyOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Typography } from "antd";
import { useMemo } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
  const breadcrumbItems = useMemo(() => {
    if (location.pathname.startsWith("/competitions/")) {
      return [
        { title: <Link to="/competitions">比赛管理</Link> },
        { title: "比赛详情" },
      ];
    }

    if (location.pathname.startsWith("/competitions")) {
      return [{ title: "比赛管理" }];
    }

    if (location.pathname.startsWith("/users")) {
      return [{ title: "账号管理" }];
    }

    return [{ title: "概览" }];
  }, [location.pathname]);

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
      <nav className={classes.nav!}>
        <div className={classes.brand!}>
          <Typography.Text className={classes.brandName!} strong>
            BJCP Arena
          </Typography.Text>
        </div>

        <Menu
          className={classes.menu!}
          items={items}
          mode="horizontal"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
        />

        <div className={classes.account!}>
          <div className={classes.accountText!}>
            <Typography.Text className={classes.accountName!} strong>
              {user.nickname}
            </Typography.Text>
            <Typography.Text className={classes.accountRoles!} type="secondary">
              {describeRoles(user.roles)}
            </Typography.Text>
          </div>
          <Button
            aria-label="退出登录"
            icon={<LogoutOutlined />}
            size="small"
            onClick={onLogout}
          />
        </div>
      </nav>

      <Layout className={classes.main!}>
        <div className={classes.breadcrumbBar!}>
          <Breadcrumb items={breadcrumbItems} />
        </div>
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
    </Layout>
  );
}
