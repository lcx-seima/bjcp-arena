import { Alert, Card, QRCode, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { type UserPublic } from "@bjcp-arena/contracts";
import { client } from "../../app/api.js";
import { apiBaseUrl } from "../../app/env.js";
import { PageHeader } from "../../components/ui/PageHeader.js";
import { readError } from "../../utils/errors.js";
import { describeRoles } from "../../utils/roles.js";
import styles from "./OverviewPage.module.css";

const judgeLanPort = 9002;

export function OverviewPage({ user }: { user: UserPublic }) {
  return (
    <div className="stack-lg">
      <PageHeader eyebrow="Overview" title="概览" />
      <div className="metric-grid">
        <MetricCard label="当前账号" value={user.username} />
        <MetricCard label="角色" value={describeRoles(user.roles)} />
        <MetricCard label="API 地址" value={apiBaseUrl} />
      </div>
      <JudgeAccessCard />
    </div>
  );
}

function JudgeAccessCard() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; url: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;

    void client
      .ping()
      .then(({ lanIp }) => {
        if (!active) {
          return;
        }

        if (!lanIp) {
          setState({ status: "error", message: "服务端未检测到可用的局域网 IPv4 地址" });
          return;
        }

        setState({ status: "ready", url: `http://${lanIp}:${judgeLanPort}` });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: "error", message: readError(error) });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className={styles.judgeAccessCard!} title="裁判端局域网入口">
      {state.status === "loading" ? <Skeleton active paragraph={{ rows: 2 }} /> : null}
      {state.status === "error" ? (
        <Alert message="局域网入口获取失败" description={state.message} type="error" showIcon />
      ) : null}
      {state.status === "ready" ? (
        <div className={styles.judgeAccessContent!}>
          <QRCode value={state.url} size={168} />
          <div className={`${styles.judgeAccessDetails!} stack-xs`}>
            <Typography.Title level={4}>扫码打开裁判端</Typography.Title>
            <Typography.Text type="secondary">
              请确保手机与服务端处于同一局域网。
            </Typography.Text>
            <Typography.Link
              className={styles.judgeAccessUrl!}
              href={state.url}
              target="_blank"
              rel="noreferrer"
            >
              {state.url}
            </Typography.Link>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="stack-xs">
        <Typography.Text strong type="secondary">
          {label}
        </Typography.Text>
        <Typography.Text strong style={{ overflowWrap: "anywhere" }}>
          {value}
        </Typography.Text>
      </div>
    </Card>
  );
}
