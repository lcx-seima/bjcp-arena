import { Center, Loader } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { canAccessJudgeApp, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "./api.js";
import { clearToken, readToken, saveToken } from "./session.js";
import { LoginPage } from "../pages/login/LoginPage.js";
import { RestoreErrorPage } from "../pages/session/RestoreErrorPage.js";
import { RoleDeniedPage } from "../pages/session/RoleDeniedPage.js";
import { UserInfoPage } from "../pages/session/UserInfoPage.js";
import { isUnauthorized, readError } from "../utils/errors.js";

interface AppState {
  error: string | null;
  status: "loading" | "ready" | "restore-error";
  user: UserPublic | null;
}

export function App() {
  const [state, setState] = useState<AppState>({ error: null, status: "loading", user: null });

  const endSession = useCallback(() => {
    clearToken();
    setState({ error: null, status: "ready", user: null });
  }, []);

  const restoreSession = useCallback(async () => {
    if (!readToken()) {
      setState({ error: null, status: "ready", user: null });
      return;
    }

    setState({ error: null, status: "loading", user: null });

    try {
      const result = await client.me();
      setState({ error: null, status: "ready", user: result.user });
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        endSession();
        return;
      }

      setState({
        error: readError(unknownError),
        status: "restore-error",
        user: null,
      });
    }
  }, [endSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const handleLogin = useCallback((token: string, user: UserPublic) => {
    saveToken(token);
    setState({ error: null, status: "ready", user });
  }, []);

  const handleLogout = useCallback(() => {
    void client.logout().catch(() => undefined);
    endSession();
  }, [endSession]);

  if (state.status === "loading") {
    return (
      <Center mih="100vh" p="md">
        <Loader />
      </Center>
    );
  }

  return (
    <Center mih="100vh" p="md">
      {state.status === "restore-error" ? (
        <RestoreErrorPage
          error={state.error ?? "恢复登录态失败，请稍后重试"}
          onLogout={handleLogout}
          onRetry={() => void restoreSession()}
        />
      ) : !state.user ? (
        <LoginPage onLogin={handleLogin} onUnauthorized={endSession} />
      ) : !canAccessJudgeApp(state.user.roles) ? (
        <RoleDeniedPage user={state.user} onLogout={handleLogout} />
      ) : (
        <UserInfoPage user={state.user} onLogout={handleLogout} />
      )}
    </Center>
  );
}
