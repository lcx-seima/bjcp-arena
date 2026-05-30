import { StrictMode, useCallback, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { ApiClientHttpError, createApiClient, type FetchLike } from "@bjcp-arena/api-client";
import {
  canAccessJudgeApp,
  hasRole,
  roleLabels,
  userRoleValues,
  type UserPublic,
} from "@bjcp-arena/contracts";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const tokenStorageKey = "bjcp-arena.judge.token";

const client = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: fetch as FetchLike,
  getToken: () => localStorage.getItem(tokenStorageKey),
});

interface AppState {
  error: string | null;
  status: "loading" | "ready" | "restore-error";
  user: UserPublic | null;
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiClientHttpError && error.status === 401;
}

function saveToken(token: string) {
  localStorage.setItem(tokenStorageKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenStorageKey);
}

function describeRoles(roles: number) {
  const labels = userRoleValues
    .filter((role) => hasRole(roles, role))
    .map((role) => roleLabels[role]);

  return labels.length > 0 ? labels.join("、") : "未配置";
}

function App() {
  const [state, setState] = useState<AppState>({ error: null, status: "loading", user: null });

  const endSession = useCallback(() => {
    clearToken();
    setState({ error: null, status: "ready", user: null });
  }, []);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem(tokenStorageKey);

    if (!token) {
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
      <main className="app-shell">
        <section className="panel compact-panel">
          <p className="muted">正在恢复登录状态...</p>
        </section>
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

  if (!state.user) {
    return <LoginPage onLogin={handleLogin} onUnauthorized={endSession} />;
  }

  if (!canAccessJudgeApp(state.user.roles)) {
    return <RoleDeniedPage user={state.user} onLogout={handleLogout} />;
  }

  return <UserInfoPage user={state.user} onLogout={handleLogout} />;
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
    <main className="app-shell">
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Judge H5</p>
          <h1>恢复登录态失败</h1>
          <p className="muted breakable">API：{apiBaseUrl}</p>
        </div>

        <p className="form-error">{error}</p>

        <div className="actions split-actions">
          <button className="secondary-button" type="button" onClick={onRetry}>
            重试
          </button>
          <button className="secondary-button danger-button" type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </section>
    </main>
  );
}

function LoginPage({
  onLogin,
  onUnauthorized,
}: {
  onLogin: (token: string, user: UserPublic) => void;
  onUnauthorized: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await client.login({ username, password });
      onLogin(session.token, session.user);
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onUnauthorized();
        setError("用户名或密码错误");
      } else {
        setError(readError(unknownError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <form className="panel login-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <p className="eyebrow">Judge H5</p>
          <h1>裁判端登录</h1>
          <p className="muted breakable">API：{apiBaseUrl}</p>
        </div>

        <label className="field">
          <span>用户名</span>
          <input
            autoComplete="username"
            inputMode="text"
            pattern="[A-Za-z0-9]+"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="field">
          <span>密码</span>
          <input
            autoComplete="current-password"
            minLength={6}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}

function RoleDeniedPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <main className="app-shell">
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Judge H5</p>
          <h1>当前账号不可用于裁判端</h1>
          <p className="muted">请使用裁判员角色账号登录。</p>
        </div>

        <UserSummary user={user} />

        <button className="secondary-button" type="button" onClick={onLogout}>
          退出当前账号
        </button>
      </section>
    </main>
  );
}

function UserInfoPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <main className="app-shell">
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Judge H5</p>
          <h1>当前登录用户</h1>
        </div>

        <UserSummary user={user} apiBaseUrl={apiBaseUrl} />

        <div className="actions">
          <button className="secondary-button danger-button" type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </section>
    </main>
  );
}

function UserSummary({ user, apiBaseUrl }: { user: UserPublic; apiBaseUrl?: string }) {
  return (
    <dl className="info-list">
      <div>
        <dt>昵称</dt>
        <dd>{user.nickname}</dd>
      </div>
      <div>
        <dt>用户名</dt>
        <dd>{user.username}</dd>
      </div>
      <div>
        <dt>角色</dt>
        <dd>{describeRoles(user.roles)}</dd>
      </div>
      {apiBaseUrl ? (
        <div>
          <dt>API 地址</dt>
          <dd>{apiBaseUrl}</dd>
        </div>
      ) : null}
    </dl>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
