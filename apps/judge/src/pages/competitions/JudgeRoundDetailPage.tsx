import { Button, List, Popup, Space, Toast } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeRoundDetailResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { EmptyState } from "../../components/ui/EmptyState.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";
import { formatJudgeSubmittedBeerListItem } from "./judge-submitted-beer-list.js";

type JudgeRoundDetail = JudgeRoundDetailResult;

const entryCodeLength = 6;
const letterKeypad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const numberKeypad = "0123456789".split("");

function createEmptyEntryCodeSlots() {
  return Array.from({ length: entryCodeLength }, () => "");
}

function ScoreIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M21.8 10A10 10 0 1 1 17 3.34"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9 11 3 3L22 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SubmittedAtIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function JudgeRoundDetailPage({
  competitionId,
  onLogout,
  roundId,
}: {
  competitionId: number;
  onLogout: () => void;
  roundId: number;
}) {
  const [detail, setDetail] = useState<JudgeRoundDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpened, setSheetOpened] = useState(false);
  const [entryCodeSlots, setEntryCodeSlots] = useState(createEmptyEntryCodeSlots);
  const [activeEntryCodeIndex, setActiveEntryCodeIndex] = useState(0);
  const entryCode = entryCodeSlots.join("");

  useEffect(() => {
    void client
      .getJudgeRound(competitionId, roundId)
      .then(setDetail)
      .catch((unknownError) => {
        if (isUnauthorized(unknownError)) {
          onLogout();
          return;
        }
        setError(readError(unknownError));
      });
  }, [competitionId, onLogout, roundId]);

  async function handleLookup() {
    if (entryCodeSlots.some((slot) => !slot)) {
      const message = "请完整输入 2 位字母 + 4 位数字参赛编号";
      Toast.show({ content: message, icon: "fail" });
      return;
    }

    try {
      const result = await client.lookupJudgeBeer(competitionId, roundId, { entryCode });
      window.location.href = `/competitions/${competitionId}/rounds/${roundId}/beers/${result.beer.id}`;
    } catch (unknownError) {
      if (isUnauthorized(unknownError)) {
        onLogout();
        return;
      }
      const message = readError(unknownError);
      Toast.show({ content: message, icon: "fail" });
    }
  }

  function handleEntryCodeKey(key: string) {
    setEntryCodeSlots((current) => {
      const next = [...current];
      next[activeEntryCodeIndex] = key;
      return next;
    });
    setActiveEntryCodeIndex((current) => Math.min(entryCodeLength - 1, current + 1));
  }

  function handleEntryCodeClear() {
    setEntryCodeSlots(createEmptyEntryCodeSlots());
    setActiveEntryCodeIndex(0);
  }

  const activeKeypad = activeEntryCodeIndex < 2 ? letterKeypad : numberKeypad;
  const isEntryCodeReady = entryCodeSlots.every(Boolean);
  const canStart = detail?.round.status === "ongoing";
  const startButtonText = detail?.round.status === "ended" ? "轮次已结束" : "开始评比";

  return (
    <>
      <MobileShell
        back={{
          label: "返回轮次列表",
          onClick: () => {
            window.location.href = `/competitions/${competitionId}`;
          },
        }}
        bottomAction={
          <Button
            block
            color="primary"
            disabled={!canStart}
            onClick={() => {
              setSheetOpened(true);
            }}
          >
            {startButtonText}
          </Button>
        }
        title={detail?.round.name ?? "轮次"}
      >
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="section-label">本轮已提交的酒款评价</div>
        <List mode="card">
          {detail?.beers.map((beer) => {
            const listItem = formatJudgeSubmittedBeerListItem(beer);

            return (
              <List.Item
                arrow
                key={beer.id}
                onClick={() => {
                  window.location.href = `/competitions/${competitionId}/rounds/${roundId}/beers/${beer.id}`;
                }}
              >
                <div className="submitted-beer-item">
                  <div className="submitted-beer-item__headline">
                    <span className="submitted-beer-item__code">{listItem.entryCode}</span>
                    <span className="submitted-beer-item__style">
                      {listItem.bjcpSubcategoryLabel}
                    </span>
                  </div>
                  <div className="submitted-beer-item__meta">
                    <span className="submitted-beer-item__meta-item submitted-beer-item__score">
                      <span className="submitted-beer-item__meta-icon">
                        <ScoreIcon />
                      </span>
                      <span>{listItem.totalScoreLabel}</span>
                    </span>
                    <span className="submitted-beer-item__meta-item submitted-beer-item__submitted-at">
                      <span className="submitted-beer-item__meta-icon">
                        <SubmittedAtIcon />
                      </span>
                      <span>{listItem.submittedAtLabel}</span>
                    </span>
                  </div>
                </div>
              </List.Item>
            );
          })}
        </List>
        {detail && detail.beers.length === 0 && !error ? (
          <EmptyState title="暂无已提交酒款评价" subTitle="点击下方按钮开始评比" />
        ) : null}
      </MobileShell>

      <Popup
        bodyStyle={{
          borderRadius: "8px 8px 0 0",
          boxSizing: "border-box",
          height: "min(560px, calc(100vh - 96px))",
          overflowY: "auto",
          padding: 16,
        }}
        visible={sheetOpened}
        onMaskClick={() => setSheetOpened(false)}
      >
        <div className="entry-code-sheet">
          <PageHeader eyebrow="Entry Code" title="输入参赛编号" />
          <div className="entry-code-boxes">
            {entryCodeSlots.map((slot, index) => (
              <button
                aria-label={`第 ${index + 1} 位参赛编号`}
                className={
                  index === activeEntryCodeIndex
                    ? "entry-code-box entry-code-box--active"
                    : "entry-code-box"
                }
                key={index}
                type="button"
                onClick={() => setActiveEntryCodeIndex(index)}
              >
                {slot || (
                  <span className="entry-code-box__placeholder">{index < 2 ? "A" : "0"}</span>
                )}
              </button>
            ))}
          </div>
          <div className="muted-text">
            第 {activeEntryCodeIndex + 1} 位：
            {activeEntryCodeIndex < 2 ? "请输入字母" : "请输入数字"}
          </div>
          <div className="keypad-grid">
            {activeKeypad.map((key) => (
              <Button key={key} onClick={() => handleEntryCodeKey(key)}>
                {key}
              </Button>
            ))}
          </div>
          <Space block direction="vertical">
            <Button block onClick={handleEntryCodeClear}>
              全部清除
            </Button>
            <Button
              block
              color="primary"
              disabled={!isEntryCodeReady}
              onClick={() => void handleLookup()}
            >
              查询
            </Button>
          </Space>
        </div>
      </Popup>
    </>
  );
}
