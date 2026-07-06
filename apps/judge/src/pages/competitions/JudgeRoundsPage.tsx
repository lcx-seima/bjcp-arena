import { Button, Card, List, Tag } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeRoundListResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeRound = JudgeRoundListResult["rounds"][number];

export function JudgeRoundsPage({
  competitionId,
  onLogout,
}: {
  competitionId: number;
  onLogout: () => void;
}) {
  const [rounds, setRounds] = useState<JudgeRound[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .listJudgeRounds(competitionId)
      .then((result) => setRounds(result.rounds))
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [competitionId, onLogout]);

  return (
    <Card className="mobile-card">
      <div className="stack-md">
        <div className="top-row">
          <PageHeader eyebrow="Rounds" title="轮次列表" />
          <Button color="danger" fill="outline" size="small" onClick={onLogout}>
            退出
          </Button>
        </div>
        <Button
          block
          onClick={() => {
            window.location.href = "/";
          }}
        >
          返回比赛
        </Button>
        {error ? <InlineError>{error}</InlineError> : null}
        <List>
          {rounds.map((round) => (
            <List.Item
              arrow
              key={round.id}
              description={`已提交 ${round.submittedBeerCount} 款`}
              extra={
                <Tag color={round.status === "ongoing" ? "primary" : "default"}>
                  {round.status === "ongoing" ? "比赛中" : "结束"}
                </Tag>
              }
              onClick={() => {
                window.location.href = `/competitions/${competitionId}/rounds/${round.id}`;
              }}
            >
              {round.name}
            </List.Item>
          ))}
        </List>
      </div>
    </Card>
  );
}
