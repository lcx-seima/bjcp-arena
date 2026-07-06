import { Button, Card, List, Tag } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeCompetitionListResult, UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
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
    <Card className="mobile-card">
      <div className="stack-md">
        <div className="top-row">
          <PageHeader eyebrow="Judge" title="比赛列表" description={`当前账号：${user.nickname}`} />
          <Button color="danger" fill="outline" size="small" onClick={onLogout}>
            退出
          </Button>
        </div>
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
      </div>
    </Card>
  );
}
