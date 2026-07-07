import { List, Tag } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeRoundListResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { EmptyState } from "../../components/ui/EmptyState.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { formatFullDateTime } from "../../utils/datetime.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeRound = JudgeRoundListResult["rounds"][number];
type JudgeCompetition = JudgeRoundListResult["competition"];

export function JudgeRoundsPage({
  competitionId,
  onLogout,
}: {
  competitionId: number;
  onLogout: () => void;
}) {
  const [competition, setCompetition] = useState<JudgeCompetition | null>(null);
  const [rounds, setRounds] = useState<JudgeRound[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .listJudgeRounds(competitionId)
      .then((result) => {
        setCompetition(result.competition);
        setRounds(result.rounds);
      })
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [competitionId, onLogout]);

  return (
    <MobileShell
      back={{
        label: "返回比赛列表",
        onClick: () => {
          window.location.href = "/";
        },
      }}
      title="轮次列表"
    >
      {error ? <InlineError>{error}</InlineError> : null}
      {competition ? (
        <div className="stack-xs">
          <div className="section-label">比赛信息</div>
          <table className="info-table">
            <tbody>
              <tr>
                <th>名称</th>
                <td>{competition.name}</td>
              </tr>
              <tr>
                <th>状态</th>
                <td>{competition.status === "ongoing" ? "比赛中" : "已结束"}</td>
              </tr>
              <tr>
                <th>创建时间</th>
                <td>{formatFullDateTime(competition.createdAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      <List mode="card">
        {rounds.map((round) => (
          <List.Item
            arrow
            key={round.id}
            description={`已提交 ${round.submittedBeerCount} 款`}
            extra={
              <Tag color={round.status === "ongoing" ? "primary" : "default"}>
                {round.status === "ongoing" ? "本轮次进行中" : "本轮次已结束"}
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
      {rounds.length === 0 && !error ? <EmptyState title="暂无比赛轮次" /> : null}
    </MobileShell>
  );
}
