import { LogoutOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Space, Spin, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { canAccessAdminApp, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "./api.js";
import { clearToken, readToken, saveToken } from "./session.js";
import { AuthLayout } from "../layouts/AuthLayout.js";
import { AdminLayout } from "../layouts/AdminLayout.js";
import { BootstrapPage } from "../pages/bootstrap/BootstrapPage.js";
import { LoginPage } from "../pages/login/LoginPage.js";
import { RoleMismatchPage } from "../pages/overview/RoleMismatchPage.js";
import { PageHeader } from "../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../utils/errors.js";

interface AppState {
  error: string | null;
  hasUsers: boolean;
  status: "loading" | "ready" | "restore-error";
  user: UserPublic | null;
}

export function App() {
  const [state, setState] = useState<AppState>({
    error: null,
    hasUsers: true,
    status: "loading",
    user: null,
  });

  const endSession = useCallback(() => {
    clearToken();
    setState({ error: null, hasUsers: true, status: "ready", user: null });
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const bootstrapStatus = await client.getBootstrapStatus();

      if (!bootstrapStatus.hasUsers) {
        clearToken();
        setState({ error: null, hasUsers: false, status: "ready", user: null });
        return;
      }

      if (!readToken()) {
        setState({ error: null, hasUsers: true, status: "ready", user: null });
        return;
      }

      const result = await client.me();
      setState({ error: null, hasUsers: true, status: "ready", user: result.user });
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        endSession();
        return;
      }

      setState({
        error: readError(unknownError),
        hasUsers: true,
        status: "restore-error",
        user: null,
      });
    }
  }, [endSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const handleSession = useCallback((token: string, user: UserPublic) => {
    saveToken(token);
    setState({ error: null, hasUsers: true, status: "ready", user });
  }, []);

  const handleLogout = useCallback(() => {
    void client.logout().catch(() => undefined);
    endSession();
  }, [endSession]);

  if (state.status === "loading") {
    return (
      <main className="center-shell">
        <Spin size="large" />
      </main>
    );
  }

  if (state.status === "restore-error") {
    return (
      <RestoreErrorPage
        error={state.error ?? "恢复登录态失败，请稍后重试"}
        onLogout={handleLogout}
        onRetry={() => void restoreSession()}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/bootstrap"
          element={
            state.hasUsers ? (
              <Navigate to="/login" replace />
            ) : (
              <AuthLayout>
                <BootstrapPage onSession={handleSession} />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/login"
          element={
            state.hasUsers ? (
              state.user ? (
                <Navigate to="/" replace />
              ) : (
                <AuthLayout>
                  <LoginPage onSession={handleSession} />
                </AuthLayout>
              )
            ) : (
              <Navigate to="/bootstrap" replace />
            )
          }
        />
        <Route
          path="/*"
          element={
            state.hasUsers ? (
              state.user ? (
                canAccessAdminApp(state.user.roles) ? (
                  <AdminLayout user={state.user} onLogout={handleLogout} />
                ) : (
                  <main className="center-shell center-shell--padded">
                    <RoleMismatchPage user={state.user} onLogout={handleLogout} />
                  </main>
                )
              ) : (
                <Navigate to="/login" replace />
              )
            ) : (
              <Navigate to="/bootstrap" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function RestoreErrorPage({
  error,
  onLogout,
  onRetry,
}: {
  error: string;
  onLogout: () => void;
  onRetry: () => void;
}) {
  return (
    <main className="center-shell center-shell--padded">
      <Card className="restore-card">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <PageHeader eyebrow="Admin Console" title="恢复登录态失败" />
          <Typography.Text type="danger">{error}</Typography.Text>
          <Flex gap={8}>
            <Button block icon={<ReloadOutlined />} onClick={onRetry}>
              重试
            </Button>
            <Button block icon={<LogoutOutlined />} onClick={onLogout}>
              退出登录
            </Button>
          </Flex>
        </Space>
      </Card>
    </main>
  );
}
