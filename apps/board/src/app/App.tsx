import { Button, Center, Loader, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { canAccessAdminApp, type UserPublic } from "@bjcp-arena/contracts";
import { BoardPage } from "../pages/board/BoardPage.js";
import { client } from "./api.js";
import { clearToken, readToken, saveToken } from "./session.js";

interface AppState {
  error: string | null;
  status: "loading" | "ready";
  user: UserPublic | null;
}

function readCompetitionId(pathname: string) {
  const match = pathname.match(/^\/competitions\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function App() {
  const [state, setState] = useState<AppState>({ error: null, status: "loading", user: null });
  const competitionId = readCompetitionId(window.location.pathname);

  const endSession = useCallback(() => {
    clearToken();
    setState({ error: null, status: "ready", user: null });
  }, []);

  const restoreSession = useCallback(async () => {
    if (!readToken()) {
      setState({ error: null, status: "ready", user: null });
      return;
    }

    try {
      const result = await client.me();
      setState({ error: null, status: "ready", user: result.user });
    } catch {
      endSession();
    }
  }, [endSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  if (state.status === "loading") {
    return (
      <Center mih="100vh">
        <Loader color="gray.0" />
      </Center>
    );
  }

  if (!state.user) {
    return <BoardLogin onSession={(token, user) => {
      saveToken(token);
      setState({ error: null, status: "ready", user });
    }} />;
  }

  if (!canAccessAdminApp(state.user.roles)) {
    return (
      <Center mih="100vh" p="lg">
        <Paper maw={420} p="xl" w="100%">
          <Stack gap="md">
            <Text fw={900}>当前账号无大屏权限</Text>
            <Text c="dimmed">请使用管理员账号登录。</Text>
            <Button variant="default" onClick={endSession}>
              重新登录
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (!competitionId) {
    return (
      <Center mih="100vh" p="lg">
        <Paper maw={520} p="xl" w="100%">
          <Stack gap="md">
            <Text fw={900}>请选择比赛</Text>
            <Text c="dimmed">访问 /competitions/:competitionId 查看指定比赛大屏。</Text>
            <Button variant="default" onClick={endSession}>
              退出登录
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return <BoardPage competitionId={competitionId} onLogout={endSession} />;
}

function BoardLogin({ onSession }: { onSession: (token: string, user: UserPublic) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await client.login({ username, password });
      onSession(session.token, session.user);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Center mih="100vh" p="lg">
      <Paper component="form" maw={420} p="xl" w="100%" onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Text c="dimmed" fw={800} size="sm" tt="uppercase">
              Live Board
            </Text>
            <Text fw={900} size="xl">
              大屏登录
            </Text>
          </div>
          <TextInput
            label="用户名"
            required
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />
          <PasswordInput
            label="密码"
            required
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          {error ? (
            <Text c="red.4" size="sm">
              {error}
            </Text>
          ) : null}
          <Button loading={isSubmitting} type="submit">
            登录
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
