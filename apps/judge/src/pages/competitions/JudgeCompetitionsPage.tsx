import { Button, Tag } from "antd-mobile";
import { useEffect, useState } from "react";
import {
  judgeTypeLabels,
  type JudgeCompetitionListResult,
  type UserPublic,
} from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { BrandMark } from "../../components/ui/BrandMark.js";
import { EmptyState } from "../../components/ui/EmptyState.js";
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
      rightAction={
        <Button color="danger" fill="outline" size="small" onClick={onLogout}>
          退出
        </Button>
      }
      title="比赛列表"
    >
      <BrandMark
        subtitle={
          <div className="brand-mark__account">
            <span>当前账号：{user.nickname}</span>
            {user.judgeType ? <Tag color="primary">{judgeTypeLabels[user.judgeType]}</Tag> : null}
          </div>
        }
      />
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="competition-card-list">
        {competitions.map((competition) => (
          <button
            className="competition-card"
            key={competition.id}
            type="button"
            onClick={() => {
              window.location.href = `/competitions/${competition.id}`;
            }}
          >
            <span className="competition-card__main">
              <span className="competition-card__name">{competition.name}</span>
              <Tag color={competition.status === "ongoing" ? "primary" : "default"}>
                {competition.status === "ongoing" ? "比赛中" : "结束"}
              </Tag>
            </span>
            <span className="competition-card__arrow" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
      {competitions.length === 0 && !error ? <EmptyState title="暂无比赛" /> : null}
    </MobileShell>
  );
}
