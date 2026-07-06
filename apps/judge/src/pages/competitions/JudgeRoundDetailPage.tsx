import { Button, List, Popup, Space, Tag, Toast } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeRoundDetailResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { MobileShell } from "../../components/ui/MobileShell.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeRoundDetail = JudgeRoundDetailResult;

const entryCodeLength = 6;
const letterKeypad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const numberKeypad = "0123456789".split("");

function createEmptyEntryCodeSlots() {
  return Array.from({ length: entryCodeLength }, () => "");
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
            开始评比
          </Button>
        }
        title={detail?.round.name ?? "轮次"}
      >
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="section-label">已提交酒款</div>
        <List>
          {detail?.beers.map((beer) => (
            <List.Item
              arrow
              key={beer.id}
              description={`${beer.bjcpSubcategoryCode} ${beer.bjcpSubcategoryName}`}
              extra={<Tag>{new Date(beer.submittedAt).toLocaleTimeString()}</Tag>}
              onClick={() => {
                window.location.href = `/competitions/${competitionId}/rounds/${roundId}/beers/${beer.id}`;
              }}
            >
              #{beer.entryNumber} {beer.entryCode}
            </List.Item>
          ))}
        </List>
      </MobileShell>

      <Popup
        bodyStyle={{ borderRadius: "8px 8px 0 0", padding: 16 }}
        visible={sheetOpened}
        onMaskClick={() => setSheetOpened(false)}
      >
        <div className="stack-md">
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
