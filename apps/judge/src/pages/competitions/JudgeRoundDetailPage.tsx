import { Button, Card, List, Popup, Space, Tag, Toast } from "antd-mobile";
import { useEffect, useState } from "react";
import type { JudgeRoundDetailResult } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { InlineError } from "../../components/ui/InlineError.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { isUnauthorized, readError } from "../../utils/errors.js";

type JudgeRoundDetail = JudgeRoundDetailResult;

const keypad = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
  const [entryCode, setEntryCode] = useState("");

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
    setError(null);
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
      setError(message);
    }
  }

  const canStart = detail?.round.status === "ongoing";

  return (
    <Card className="mobile-card">
      <div className="score-shell">
        <div className="stack-md">
          <div className="top-row">
            <PageHeader eyebrow="Round" title={detail?.round.name ?? "轮次"} />
            <Button color="danger" fill="outline" size="small" onClick={onLogout}>
              退出
            </Button>
          </div>
          <Button
            block
            onClick={() => {
              window.location.href = `/competitions/${competitionId}`;
            }}
          >
            返回轮次列表
          </Button>
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
        </div>

        <Button
          block
          className="bottom-action"
          color="primary"
          disabled={!canStart}
          onClick={() => setSheetOpened(true)}
        >
          开始评比
        </Button>
      </div>

      <Popup
        bodyStyle={{ borderRadius: "8px 8px 0 0", padding: 16 }}
        visible={sheetOpened}
        onMaskClick={() => setSheetOpened(false)}
      >
        <div className="stack-md">
          <PageHeader eyebrow="Entry Code" title="输入参赛编号" />
          <div className="entry-code-boxes">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="entry-code-box" key={index}>
                {entryCode[index] ?? ""}
              </div>
            ))}
          </div>
          <div className="keypad-grid">
            {keypad.map((key) => (
              <Button
                disabled={entryCode.length >= 6}
                key={key}
                onClick={() => setEntryCode((current) => `${current}${key}`.slice(0, 6))}
              >
                {key}
              </Button>
            ))}
          </div>
          <Space block direction="vertical">
            <Button block onClick={() => setEntryCode("")}>
              清除
            </Button>
            <Button
              block
              color="primary"
              disabled={entryCode.length !== 6}
              onClick={() => void handleLookup()}
            >
              查询
            </Button>
          </Space>
        </div>
      </Popup>
    </Card>
  );
}
