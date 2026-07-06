import { Button, List, Tag } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeCompetitionListResult, UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeCompetition = JudgeCompetitionListResult["competitions"][number];

export function JudgeCompetitionsPage({
  onLogout,
  user,
}: {
  onLogout: () => void;
  user: UserPublic;
}) {
  const [competitions, setCompetitions] = useState<JudgeCompetition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .listJudgeCompetitions()
      .then((result) => setCompetitions(result.competitions))
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [onLogout]);

  return (
    <MobileShell
      description={`当前账号：${user.nickname}`}
      rightAction={
        <Button color="danger" fill="outline" size="small" onClick={onLogout}>
          退出
        </Button>
      }
      title="比赛列表"
    >
      {error ? <InlineError>{error}</InlineError> : null}
      <List>
        {competitions.map((competition) => (
          <List.Item
            arrow
            key={competition.id}
            extra={
              <Tag color={competition.status === "ongoing" ? "primary" : "default"}>
                {competition.status === "ongoing" ? "比赛中" : "结束"}
              </Tag>
            }
            onClick={() => {
              window.location.href = `/competitions/${competition.id}`;
            }}
          >
            {competition.name}
          </List.Item>
        ))}
      </List>
    </MobileShell>
  );
}
