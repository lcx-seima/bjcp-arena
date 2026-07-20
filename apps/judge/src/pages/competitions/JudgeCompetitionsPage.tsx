import { Tag } from "antd-mobile";
import { useEffect, useState } from "react";
import {
  type JudgeCompetitionListResult,
  type JudgeType,
  type UserPublic,
} from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { BrandMark } from "../../components/ui/BrandMark.js";
import { EmptyState } from "../../components/ui/EmptyState.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeCompetition = JudgeCompetitionListResult["competitions"][number];

const judgeTypeTagPresentation: Record<
  JudgeType,
  { color: string; label: string; symbol: string; textColor: string }
> = {
  professional: {
    color: "#e8b94d",
    label: "专业裁判",
    symbol: "★",
    textColor: "#3b1a0b",
  },
  senior_enthusiast: {
    color: "#237804",
    label: "资深爱好者",
    symbol: "◆",
    textColor: "#ffffff",
  },
  public: { color: "#69b1ff", label: "消费者", symbol: "●", textColor: "#002c8c" },
};

function UserCenterIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function JudgeCompetitionsPage({
  onLogout,
  onOpenUserCenter,
  user,
}: {
  onLogout: () => void;
  onOpenUserCenter: () => void;
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
        <button
          aria-label="个人中心"
          className="mobile-shell__icon-button"
          type="button"
          onClick={onOpenUserCenter}
        >
          <UserCenterIcon />
        </button>
      }
      title="比赛列表"
    >
      <BrandMark
        subtitle={
          <div className="brand-mark__account">
            <span>当前账号：{user.nickname}</span>
            {user.judgeType ? (
              <Tag
                color={judgeTypeTagPresentation[user.judgeType].color}
                style={{
                  borderRadius: 999,
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.22)",
                  color: judgeTypeTagPresentation[user.judgeType].textColor,
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  padding: "3px 7px",
                }}
              >
                <span aria-hidden="true" style={{ marginRight: 4 }}>
                  {judgeTypeTagPresentation[user.judgeType].symbol}
                </span>
                {judgeTypeTagPresentation[user.judgeType].label}
              </Tag>
            ) : null}
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
