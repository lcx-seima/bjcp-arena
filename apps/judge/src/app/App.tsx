import { Center, Loader } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { canAccessJudgeApp, type UserPublic } from "@bjcp-arena/contracts";
import { client } from "./api.js";
import { clearToken, readToken, saveToken } from "./session.js";
import { LoginPage } from "../pages/login/LoginPage.js";
import { RestoreErrorPage } from "../pages/session/RestoreErrorPage.js";
import { RoleDeniedPage } from "../pages/session/RoleDeniedPage.js";
import { UserInfoPage } from "../pages/session/UserInfoPage.js";
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
  return { type: "competitions" as const };
}

export function App() {
  const [state, setState] = useState<AppState>({ error: null, status: "loading", user: null });
  const judgeRoute = readJudgeRoute(window.location.pathname);

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
      ) : window.location.pathname === "/" ? (
        <JudgeCompetitionsPage user={state.user} onLogout={handleLogout} />
      ) : (
        <UserInfoPage user={state.user} onLogout={handleLogout} />
      )}
    </Center>
  );
}
