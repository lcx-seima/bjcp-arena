import { AppShell, Button, Group, Stack, Text } from "@mantine/core";
import { LogOut, UsersRound, LayoutDashboard } from "lucide-react";
import { NavLink as RouterNavLink, Routes, Route, Navigate } from "react-router-dom";
import { canManageUsers, type UserPublic } from "@bjcp-arena/contracts";
import { describeRoles } from "../utils/roles.js";
import { ForbiddenPage } from "../pages/overview/ForbiddenPage.js";
import { OverviewPage } from "../pages/overview/OverviewPage.js";
import { UsersPage } from "../pages/users/UsersPage.js";
import classes from "./AdminLayout.module.css";

export function AdminLayout({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <AppShell navbar={{ width: 252, breakpoint: "sm" }} padding="lg">
      <AppShell.Navbar className={classes.navbar!} p="lg">
        <Stack gap="lg" h="100%">
          <Stack gap={2}>
            <Text c="gray.9" fw={850}>
              BJCP Arena
            </Text>
            <Text c="dimmed" size="sm">
              后台管理
            </Text>
          </Stack>

          <Stack gap={6}>
            <RouterNavLink className={classes.navLink!} end to="/">
              {({ isActive }) => (
                <Group data-active={isActive} gap="xs" p="sm" className={classes.navLink!}>
                  <LayoutDashboard size={16} />
                  <span>概览</span>
                </Group>
              )}
            </RouterNavLink>
            {canManageUsers(user.roles) ? (
              <RouterNavLink className={classes.navLink!} to="/users">
                {({ isActive }) => (
                  <Group data-active={isActive} gap="xs" p="sm" className={classes.navLink!}>
                    <UsersRound size={16} />
                    <span>账号管理</span>
                  </Group>
                )}
              </RouterNavLink>
            ) : null}
          </Stack>

          <Stack gap="xs" mt="auto">
            <Text fw={700} style={{ overflowWrap: "anywhere" }}>
              {user.nickname}
            </Text>
            <Text c="dimmed" size="sm" style={{ overflowWrap: "anywhere" }}>
              {describeRoles(user.roles)}
            </Text>
            <Button
              fullWidth
              leftSection={<LogOut size={16} />}
              variant="default"
              onClick={onLogout}
            >
              退出登录
            </Button>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className={classes.page!}>
        <Routes>
          <Route index element={<OverviewPage user={user} />} />
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
      </AppShell.Main>
    </AppShell>
  );
}
