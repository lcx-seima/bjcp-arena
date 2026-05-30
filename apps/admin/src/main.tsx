import { StrictMode, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { ApiClientHttpError, createApiClient, type FetchLike } from "@bjcp-arena/api-client";
import {
  adminRole,
  canAccessAdminApp,
  canManageUsers,
  hasRole,
  judgeRole,
  roleLabels,
  superAdminRole,
  type UserPublic,
} from "@bjcp-arena/contracts";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const tokenStorageKey = "bjcp-arena.admin.token";

const client = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: fetch as FetchLike,
  getToken: () => localStorage.getItem(tokenStorageKey),
});

const roleOptions = [
  { label: "赛事管理员", value: adminRole },
  { label: "裁判员", value: judgeRole },
  { label: "管理员+裁判员", value: adminRole | judgeRole },
  { label: "超级管理员", value: superAdminRole },
  { label: "超级管理员+裁判员", value: superAdminRole | judgeRole },
] as const;

interface AppState {
  error: string | null;
  hasUsers: boolean;
  status: "loading" | "ready" | "restore-error";
  user: UserPublic | null;
}

interface SessionHandlers {
  onSession: (token: string, user: UserPublic) => void;
  onLogout: () => void;
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiClientHttpError && error.status === 401;
}

function handleRequestError(error: unknown, onUnauthorized: () => void) {
  if (isUnauthorized(error)) {
    onUnauthorized();
    return "登录态已失效，请重新登录";
  }

  return readError(error);
}

function randomAlphaNumeric(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function randomNumericPassword() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => String(value % 10)).join("");
}

function describeRoles(roles: number) {
  return [superAdminRole, adminRole, judgeRole]
    .filter((role) => hasRole(roles, role))
    .map((role) => roleLabels[role])
    .join("、");
}

function saveToken(token: string) {
  localStorage.setItem(tokenStorageKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenStorageKey);
}

function App() {
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

      const token = localStorage.getItem(tokenStorageKey);
      if (!token) {
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
        <section className="panel narrow-panel">
          <p className="muted">正在连接后台服务...</p>
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

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/bootstrap"
          element={
            state.hasUsers ? (
              <Navigate to="/login" replace />
            ) : (
              <BootstrapPage onSession={handleSession} onLogout={handleLogout} />
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
                <LoginPage onSession={handleSession} onLogout={handleLogout} />
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
                <AdminShell user={state.user} onLogout={handleLogout} />
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
    <main className="center-shell">
      <section className="panel narrow-panel auth-form">
        <div className="section-heading">
          <p className="eyebrow">Admin Console</p>
          <h1>恢复登录态失败</h1>
          <p className="muted">API：{apiBaseUrl}</p>
        </div>

        <p className="form-error">{error}</p>

        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={onRetry}>
            重试
          </button>
          <button className="ghost-button" type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </section>
    </main>
  );
}

function LoginPage({ onSession }: SessionHandlers) {
  const navigate = useNavigate();
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
      onSession(session.token, session.user);
      navigate("/", { replace: true });
    } catch (unknownError) {
      setError(readError(unknownError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="center-shell">
      <form className="panel narrow-panel auth-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <p className="eyebrow">Admin Console</p>
          <h1>后台登录</h1>
          <p className="muted">API：{apiBaseUrl}</p>
        </div>

        <label>
          <span>用户名</span>
          <input
            autoComplete="username"
            pattern="[A-Za-z0-9]+"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
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

function BootstrapPage({ onSession }: SessionHandlers) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await client.bootstrapSuperAdmin({ password });
      onSession(session.token, session.user);
      navigate("/", { replace: true });
    } catch (unknownError) {
      setError(readError(unknownError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="center-shell">
      <form className="panel narrow-panel auth-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <p className="eyebrow">Bootstrap</p>
          <h1>初始化超级管理员</h1>
          <p className="muted">系统尚无用户，请设置初始超级管理员密码。</p>
        </div>

        <div className="readonly-grid">
          <label>
            <span>用户名</span>
            <input readOnly value="superadmin" />
          </label>
          <label>
            <span>昵称</span>
            <input readOnly value="superadmin" />
          </label>
        </div>

        <label>
          <span>密码</span>
          <input
            autoComplete="new-password"
            minLength={6}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "初始化中..." : "创建并登录"}
        </button>
      </form>
    </main>
  );
}

function AdminShell({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  if (!canAccessAdminApp(user.roles)) {
    return <RoleMismatchPage user={user} onLogout={onLogout} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="brand">BJCP Arena</p>
          <p className="muted small-text">后台管理</p>
        </div>
        <nav className="nav-list" aria-label="后台导航">
          <NavLink end to="/">
            概览
          </NavLink>
          {canManageUsers(user.roles) ? <NavLink to="/users">账号管理</NavLink> : null}
        </nav>
        <div className="account-card">
          <strong>{user.nickname}</strong>
          <span>{describeRoles(user.roles)}</span>
          <button className="ghost-button full-width" type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="page-root">
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
      </main>
    </div>
  );
}

function RoleMismatchPage({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
  return (
    <main className="center-shell">
      <section className="panel narrow-panel">
        <div className="section-heading">
          <p className="eyebrow">无权限</p>
          <h1>当前角色不能进入后台</h1>
          <p className="muted">
            当前账号角色为 {describeRoles(user.roles)}。后台仅允许赛事管理员或超级管理员进入。
          </p>
        </div>
        <button className="primary-button" type="button" onClick={onLogout}>
          退出登录
        </button>
      </section>
    </main>
  );
}

function ForbiddenPage() {
  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">Forbidden</p>
        <h1>无权访问</h1>
        <p className="muted">账号管理仅超级管理员可见。</p>
      </div>
    </section>
  );
}

function OverviewPage({ user }: { user: UserPublic }) {
  return (
    <section className="page-stack">
      <div className="section-heading">
        <p className="eyebrow">Overview</p>
        <h1>概览</h1>
      </div>
      <div className="metrics-grid">
        <div className="panel metric-card">
          <span>当前账号</span>
          <strong>{user.username}</strong>
        </div>
        <div className="panel metric-card">
          <span>角色</span>
          <strong>{describeRoles(user.roles)}</strong>
        </div>
        <div className="panel metric-card">
          <span>API 地址</span>
          <strong>{apiBaseUrl}</strong>
        </div>
      </div>
    </section>
  );
}

function UsersPage({ currentUser, onLogout }: { currentUser: UserPublic; onLogout: () => void }) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeSuperAdminCount = useMemo(
    () => users.filter((user) => !user.disabled && hasRole(user.roles, superAdminRole)).length,
    [users]
  );

  const refreshUsers = useCallback(async () => {
    setError(null);
    const result = await client.listUsers();
    setUsers(result.users);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void refreshUsers().catch((unknownError) => {
      setStatus("ready");
      setError(handleRequestError(unknownError, onLogout));
    });
  }, [onLogout, refreshUsers]);

  async function handleCreated(user: UserPublic) {
    setUsers((currentUsers) => [user, ...currentUsers.filter((item) => item.id !== user.id)]);
    setNotice(`已创建用户 ${user.username}`);
  }

  async function handleUpdated(user: UserPublic) {
    setUsers((currentUsers) => currentUsers.map((item) => (item.id === user.id ? user : item)));
    setNotice(`已更新用户 ${user.username}`);
  }

  return (
    <section className="page-stack">
      <div className="title-row">
        <div className="section-heading">
          <p className="eyebrow">Users</p>
          <h1>账号管理</h1>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setStatus("loading");
            void refreshUsers().catch((unknownError) => {
              setStatus("ready");
              setError(handleRequestError(unknownError, onLogout));
            });
          }}
        >
          刷新
        </button>
      </div>

      <CreateUserPanel onCreated={handleCreated} onUnauthorized={onLogout} />

      {notice ? <p className="form-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="panel table-panel">
        <div className="table-header">
          <strong>用户列表</strong>
          <span>{status === "loading" ? "加载中..." : `${users.length} 个账号`}</span>
        </div>
        <div className="user-table" role="table" aria-label="用户列表">
          <div className="user-row table-head" role="row">
            <span>用户名</span>
            <span>昵称</span>
            <span>角色</span>
            <span>状态</span>
            <span>重置密码</span>
            <span>操作</span>
          </div>
          {users.map((user) => (
            <UserRow
              activeSuperAdminCount={activeSuperAdminCount}
              currentUserId={currentUser.id}
              key={user.id}
              user={user}
              onUnauthorized={onLogout}
              onUpdated={handleUpdated}
            />
          ))}
          {status === "ready" && users.length === 0 ? (
            <p className="empty-state">暂无用户。</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CreateUserPanel({
  onCreated,
  onUnauthorized,
}: {
  onCreated: (user: UserPublic) => void;
  onUnauthorized: () => void;
}) {
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<number>(adminRole);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await client.createUser({
        username: username || undefined,
        nickname: nickname || undefined,
        password,
        roles,
      });
      onCreated(result.user);
      setUsername("");
      setNickname("");
      setPassword("");
      setRoles(adminRole);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="table-header">
        <strong>创建用户</strong>
        <span>用户名仅允许英文和数字</span>
      </div>
      <div className="form-grid">
        <label>
          <span>用户名</span>
          <div className="input-with-action">
            <input
              pattern="[A-Za-z0-9]+"
              placeholder="留空由后端生成"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <button type="button" onClick={() => setUsername(randomAlphaNumeric(6))}>
              随机
            </button>
          </div>
        </label>
        <label>
          <span>昵称</span>
          <div className="input-with-action">
            <input
              placeholder="留空由后端生成"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <button type="button" onClick={() => setNickname(`bjcp_${randomAlphaNumeric(6)}`)}>
              随机
            </button>
          </div>
        </label>
        <label>
          <span>初始密码</span>
          <div className="input-with-action">
            <input
              minLength={6}
              required
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" onClick={() => setPassword(randomNumericPassword())}>
              随机
            </button>
          </div>
        </label>
        <label>
          <span>角色</span>
          <select value={roles} onChange={(event) => setRoles(Number(event.target.value))}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "创建中..." : "创建用户"}
        </button>
      </div>
    </form>
  );
}

function UserRow({
  activeSuperAdminCount,
  currentUserId,
  user,
  onUnauthorized,
  onUpdated,
}: {
  activeSuperAdminCount: number;
  currentUserId: number;
  user: UserPublic;
  onUnauthorized: () => void;
  onUpdated: (user: UserPublic) => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [nickname, setNickname] = useState(user.nickname);
  const [roles, setRoles] = useState<number>(user.roles);
  const [disabled, setDisabled] = useState(user.disabled);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setUsername(user.username);
    setNickname(user.nickname);
    setRoles(user.roles);
    setDisabled(user.disabled);
  }, [user.authVersion, user.disabled, user.nickname, user.roles, user.updatedAt, user.username]);

  const isCurrentUser = user.id === currentUserId;
  const isExistingSuperAdmin = hasRole(user.roles, superAdminRole);
  const isActiveSuperAdmin = isExistingSuperAdmin && !user.disabled;
  const isOnlyActiveSuperAdmin = isActiveSuperAdmin && activeSuperAdminCount <= 1;
  const selectedHasSuperAdmin = hasRole(roles, superAdminRole);

  const protectionError = useMemo(() => {
    if (isCurrentUser && disabled) {
      return "不能停用当前登录账号。";
    }

    if (isCurrentUser && isExistingSuperAdmin && !selectedHasSuperAdmin) {
      return "不能把当前登录账号降权为非超级管理员。";
    }

    if (isOnlyActiveSuperAdmin && disabled) {
      return "系统只有 1 个未停用超级管理员，不能停用该账号。";
    }

    if (isOnlyActiveSuperAdmin && !selectedHasSuperAdmin) {
      return "系统只有 1 个未停用超级管理员，不能移除该账号的超级管理员角色。";
    }

    return null;
  }, [
    disabled,
    isCurrentUser,
    isExistingSuperAdmin,
    isOnlyActiveSuperAdmin,
    selectedHasSuperAdmin,
  ]);

  const hasChanges = useMemo(
    () =>
      username !== user.username ||
      nickname !== user.nickname ||
      roles !== user.roles ||
      disabled !== user.disabled,
    [disabled, nickname, roles, user.disabled, user.nickname, user.roles, user.username, username]
  );

  async function handleSave() {
    setError(null);

    if (protectionError) {
      setError(protectionError);
      return;
    }

    setIsSaving(true);

    try {
      const result = await client.updateUser(user.id, {
        username,
        nickname,
        roles,
        disabled,
      });
      onUpdated(result.user);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword() {
    setError(null);

    if (!password) {
      setError("请先填写新密码，或点击随机生成后再重置。");
      return;
    }

    setIsResetting(true);

    try {
      const result = await client.resetUserPassword(user.id, { password });
      onUpdated(result.user);
    } catch (unknownError) {
      setError(handleRequestError(unknownError, onUnauthorized));
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="user-row" role="row">
      <label>
        <span>用户名</span>
        <input
          pattern="[A-Za-z0-9]+"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        <span>昵称</span>
        <input required value={nickname} onChange={(event) => setNickname(event.target.value)} />
      </label>
      <label>
        <span>角色</span>
        <select value={roles} onChange={(event) => setRoles(Number(event.target.value))}>
          {roleOptions.map((option) => {
            const optionHasSuperAdmin = hasRole(option.value, superAdminRole);
            const disabledOption =
              (isCurrentUser && isExistingSuperAdmin && !optionHasSuperAdmin) ||
              (isOnlyActiveSuperAdmin && !optionHasSuperAdmin);

            return (
              <option disabled={disabledOption} key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
      </label>
      <label className="checkbox-field">
        <input
          checked={disabled}
          disabled={isCurrentUser || isOnlyActiveSuperAdmin}
          type="checkbox"
          onChange={(event) => setDisabled(event.target.checked)}
        />
        <span>{disabled ? "已停用" : "已启用"}</span>
      </label>
      <label>
        <span>新密码</span>
        <div className="input-with-action">
          <input
            minLength={6}
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="button" onClick={() => setPassword(randomNumericPassword())}>
            随机
          </button>
        </div>
      </label>
      <div className="row-actions">
        <button
          className="ghost-button"
          disabled={!password || isResetting}
          type="button"
          onClick={handleResetPassword}
        >
          {isResetting ? "重置中" : "重置密码"}
        </button>
        <button
          className="primary-button"
          disabled={!hasChanges || isSaving || protectionError !== null}
          type="button"
          onClick={handleSave}
        >
          {isSaving ? "保存中" : "保存"}
        </button>
        {protectionError ? <p className="guard-note">{protectionError}</p> : null}
        {error ? <p className="form-error row-error">{error}</p> : null}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
