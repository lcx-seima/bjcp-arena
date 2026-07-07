import { Dialog, DotLoading } from "antd-mobile";
import { useCallback, useEffect, useState } from "react";
import { canAccessJudgeApp, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "./api.js";
import { clearToken, readToken, saveToken } from "./session.js";
import { LoginPage } from "../pages/login/LoginPage.js";
import { RestoreErrorPage } from "../pages/session/RestoreErrorPage.js";
import { RoleDeniedPage } from "../pages/session/RoleDeniedPage.js";
import { UserCenterPopup } from "../pages/session/UserCenterPopup.js";
import { ScorePage } from "../pages/score/ScorePage.js";
import { JudgeCompetitionsPage } from "../pages/competitions/JudgeCompetitionsPage.js";
import { JudgeRoundsPage } from "../pages/competitions/JudgeRoundsPage.js";
import { JudgeRoundDetailPage } from "../pages/competitions/JudgeRoundDetailPage.js";
import { isUnauthorized, readError } from "../utils/errors.js";

interface AppState {
  error: string | null;
  status: "loading" | "ready" | "restore-error";
  user: UserPublic | null;
}

function readJudgeRoute(pathname: string) {
  if (pathname === "/" || pathname === "") {
    return { type: "competitions" as const };
  }

  const score = pathname.match(/^\/competitions\/(\d+)\/rounds\/(\d+)\/beers\/(\d+)\/?$/);
  if (score) {
    return {
      type: "score" as const,
      competitionId: Number(score[1]),
      roundId: Number(score[2]),
      beerId: Number(score[3]),
    };
  }
  const round = pathname.match(/^\/competitions\/(\d+)\/rounds\/(\d+)\/?$/);
  if (round) {
    return {
      type: "round" as const,
      competitionId: Number(round[1]),
      roundId: Number(round[2]),
    };
  }
  const competition = pathname.match(/^\/competitions\/(\d+)\/?$/);
  if (competition) {
    return {
      type: "competition" as const,
      competitionId: Number(competition[1]),
    };
  }
  return { type: "invalid" as const };
}

export function App() {
  const [state, setState] = useState<AppState>({ error: null, status: "loading", user: null });
  const [lastNicknamePromptKey, setLastNicknamePromptKey] = useState<string | null>(null);
  const [userCenterOpened, setUserCenterOpened] = useState(false);
  const [userCenterInitialMode, setUserCenterInitialMode] = useState<"summary" | "nickname">(
    "summary"
  );
  const pathname = window.location.pathname;
  const judgeRoute = readJudgeRoute(pathname);

  const endSession = useCallback(() => {
    clearToken();
    setLastNicknamePromptKey(null);
    setUserCenterOpened(false);
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

  useEffect(() => {
    if (judgeRoute.type === "invalid") {
      window.location.replace("/");
    }
  }, [judgeRoute.type]);

  const handleLogin = useCallback((token: string, user: UserPublic) => {
    saveToken(token);
    setLastNicknamePromptKey(null);
    setState({ error: null, status: "ready", user });
  }, []);

  const handleLogout = useCallback(() => {
    void client.logout().catch(() => undefined);
    endSession();
  }, [endSession]);

  const handleUserUpdated = useCallback((user: UserPublic) => {
    setLastNicknamePromptKey(null);
    setState({ error: null, status: "ready", user });
  }, []);

  useEffect(() => {
    if (!state.user || judgeRoute.type !== "competitions" || state.user.username !== state.user.nickname) {
      return;
    }

    const promptKey = `${state.user.id}:${pathname}`;
    if (lastNicknamePromptKey === promptKey) {
      return;
    }

    setLastNicknamePromptKey(promptKey);
    void Dialog.confirm({
      cancelText: "稍后",
      confirmText: "修改昵称",
      content: "当前昵称与用户名一致。建议修改为评审现场更容易识别的昵称。",
      title: "请修改昵称",
    }).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      setUserCenterInitialMode("nickname");
      setUserCenterOpened(true);
    });
  }, [judgeRoute.type, lastNicknamePromptKey, pathname, state.user]);

  if (state.status === "loading") {
    return (
      <main className="mobile-loading-shell">
        <DotLoading color="primary" />
      </main>
    );
  }

  return (
    <main className="mobile-app">
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
      ) : judgeRoute.type === "score" ? (
        <ScorePage
          beerId={judgeRoute.beerId}
          competitionId={judgeRoute.competitionId}
          roundId={judgeRoute.roundId}
          user={state.user}
          onLogout={handleLogout}
        />
      ) : judgeRoute.type === "round" ? (
        <JudgeRoundDetailPage
          competitionId={judgeRoute.competitionId}
          roundId={judgeRoute.roundId}
          onLogout={handleLogout}
        />
      ) : judgeRoute.type === "competition" ? (
        <JudgeRoundsPage competitionId={judgeRoute.competitionId} onLogout={handleLogout} />
      ) : judgeRoute.type === "competitions" ? (
        <JudgeCompetitionsPage
          user={state.user}
          onLogout={handleLogout}
          onOpenUserCenter={() => {
            setUserCenterInitialMode("summary");
            setUserCenterOpened(true);
          }}
        />
      ) : (
        <div className="mobile-loading-shell">
          <DotLoading color="primary" />
        </div>
      )}
      {state.user && canAccessJudgeApp(state.user.roles) ? (
        <UserCenterPopup
          initialMode={userCenterInitialMode}
          opened={userCenterOpened}
          user={state.user}
          onClose={() => setUserCenterOpened(false)}
          onLogout={handleLogout}
          onUnauthorized={endSession}
          onUserUpdated={handleUserUpdated}
        />
      ) : null}
    </main>
  );
}
